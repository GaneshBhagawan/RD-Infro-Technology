import Quiz from '../models/Quiz.js'

/* ── Helper: strip correct answers for takers ───────────────────────
   Never send correctAnswer to the client during an active quiz.
   This runs before sending quiz data to non-creators.           ── */
const stripAnswers = (quiz) => {
  const obj = quiz.toObject ? quiz.toObject() : quiz
  obj.questions = obj.questions.map(({ correctAnswer, explanation, ...rest }) => rest)
  return obj
}

/* ══════════════════════════════════════════════════════════════════
   1. CREATE QUIZ
   POST /api/quizzes
   Creator only — saves a new quiz as draft by default
═══════════════════════════════════════════════════════════════════ */
export const createQuiz = async (req, res) => {
  try {
    const { title, description, questions, timeLimit, status } = req.body

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({
        message: 'Title and at least one question are required',
      })
    }

    const quiz = await Quiz.create({
      title,
      description:  description || '',
      questions,
      timeLimit:    timeLimit   || 600,
      status:       status      === 'published' ? 'published' : 'draft',
      creator:      req.user._id,
      aiGenerated:  false,
    })

    res.status(201).json({ message: 'Quiz created', quiz })

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message)
      return res.status(400).json({ message: messages.join(', ') })
    }
    console.error('createQuiz error:', error)
    res.status(500).json({ message: 'Server error creating quiz' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   2. LIST ALL PUBLISHED QUIZZES  (public browse page)
   GET /api/quizzes
   Public — no auth needed. Never returns draft or deleted quizzes.
═══════════════════════════════════════════════════════════════════ */
export const getPublishedQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      status:    'published',
      isDeleted: { $ne: true },
    })
      .select('-questions.correctAnswer -questions.explanation')
      .populate('creator', 'username')
      .sort({ createdAt: -1 })

    res.status(200).json({ quizzes })

  } catch (error) {
    console.error('getPublishedQuizzes error:', error)
    res.status(500).json({ message: 'Server error fetching quizzes' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   3. GET CREATOR'S OWN QUIZZES  (dashboard)
   GET /api/quizzes/my
   Creator only — returns ALL their quizzes including drafts
═══════════════════════════════════════════════════════════════════ */
export const getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      creator:   req.user._id,
      isDeleted: { $ne: true },
    })
      .select('-questions.correctAnswer')
      .sort({ updatedAt: -1 })

    res.status(200).json({ quizzes })

  } catch (error) {
    console.error('getMyQuizzes error:', error)
    res.status(500).json({ message: 'Server error fetching your quizzes' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   4. GET SINGLE QUIZ BY ID
   GET /api/quizzes/:id
   - Creators get full data including correct answers (for editing)
   - Takers / public get quiz without correct answers
═══════════════════════════════════════════════════════════════════ */
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id:       req.params.id,
      isDeleted: { $ne: true },
    }).populate('creator', 'username')

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' })
    }

    // Check quiz is published unless the requester is the creator
    const isCreator =
      req.user && quiz.creator._id.toString() === req.user._id.toString()

    if (!isCreator && quiz.status !== 'published') {
      return res.status(403).json({ message: 'This quiz is not published yet' })
    }

    // Creators see full data; everyone else gets stripped answers
    const data = isCreator ? quiz : stripAnswers(quiz)
    res.status(200).json({ quiz: data })

  } catch (error) {
    console.error('getQuizById error:', error)
    res.status(500).json({ message: 'Server error fetching quiz' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   5. UPDATE QUIZ
   PUT /api/quizzes/:id
   Creator only — can update any field, only on their own quizzes
═══════════════════════════════════════════════════════════════════ */
export const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id:       req.params.id,
      isDeleted: { $ne: true },
    })

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' })
    }

    // Only the quiz creator can edit it
    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to edit this quiz' })
    }

    const { title, description, questions, timeLimit } = req.body

    if (title)       quiz.title       = title
    if (description) quiz.description = description
    if (questions)   quiz.questions   = questions
    if (timeLimit)   quiz.timeLimit   = timeLimit

    await quiz.save()

    res.status(200).json({ message: 'Quiz updated', quiz })

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message)
      return res.status(400).json({ message: messages.join(', ') })
    }
    console.error('updateQuiz error:', error)
    res.status(500).json({ message: 'Server error updating quiz' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   6. TOGGLE DRAFT / PUBLISHED
   PATCH /api/quizzes/:id/publish
   Creator only — flips the status field
═══════════════════════════════════════════════════════════════════ */
export const togglePublish = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id:       req.params.id,
      isDeleted: { $ne: true },
    })

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' })
    }

    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' })
    }

    // Must have at least 1 question before publishing
    if (quiz.questions.length === 0 && quiz.status === 'draft') {
      return res.status(400).json({
        message: 'Add at least one question before publishing',
      })
    }

    quiz.status = quiz.status === 'draft' ? 'published' : 'draft'
    await quiz.save()

    res.status(200).json({
      message: `Quiz is now ${quiz.status}`,
      status:  quiz.status,
    })

  } catch (error) {
    console.error('togglePublish error:', error)
    res.status(500).json({ message: 'Server error toggling publish status' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   7. SOFT DELETE
   DELETE /api/quizzes/:id
   Creator only — sets isDeleted: true, never removes from DB.
   Historical attempts are preserved for leaderboard integrity.
═══════════════════════════════════════════════════════════════════ */
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id:       req.params.id,
      isDeleted: { $ne: true },
    })

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' })
    }

    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to delete this quiz' })
    }

    // SOFT DELETE — flag it, never wipe it
    quiz.isDeleted = true
    await quiz.save()

    res.status(200).json({ message: 'Quiz deleted successfully' })

  } catch (error) {
    console.error('deleteQuiz error:', error)
    res.status(500).json({ message: 'Server error deleting quiz' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   8. QUIZ ANALYTICS
   GET /api/quizzes/:id/analytics
   Creator only — performance metrics for their quiz
═══════════════════════════════════════════════════════════════════ */
export const getQuizAnalytics = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id:       req.params.id,
      isDeleted: { $ne: true },
    })

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' })
    }

    if (quiz.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' })
    }

    // Import Attempt here to avoid circular dependency risk
    const Attempt = (await import('../models/Attempt.js')).default

    const attempts = await Attempt.find({ quiz: quiz._id })

    if (attempts.length === 0) {
      return res.status(200).json({
        totalAttempts:  0,
        averageScore:   0,
        completionRate: 0,
        questionStats:  [],
      })
    }

    // Average score across all attempts
    const averageScore = Math.round(
      attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
    )

    // Completion rate = attempts that were NOT timed out
    const completed     = attempts.filter((a) => !a.timedOut).length
    const completionRate = Math.round((completed / attempts.length) * 100)

    // Per-question accuracy — how many users got each question right
    const questionStats = quiz.questions.map((question) => {
      const total   = attempts.length
      const correct = attempts.filter((attempt) =>
        attempt.answers.some(
          (ans) =>
            ans.questionId.toString() === question._id.toString() &&
            ans.isCorrect === true
        )
      ).length

      return {
        questionId:   question._id,
        questionText: question.text,
        correctCount: correct,
        totalCount:   total,
        accuracy:     total > 0 ? Math.round((correct / total) * 100) : 0,
      }
    })

    res.status(200).json({
      totalAttempts:  attempts.length,
      averageScore,
      completionRate,
      questionStats,
    })

  } catch (error) {
    console.error('getQuizAnalytics error:', error)
    res.status(500).json({ message: 'Server error fetching analytics' })
  }
}