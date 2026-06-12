import Attempt from '../models/Attempt.js'
import Quiz    from '../models/Quiz.js'

/* ══════════════════════════════════════════════════════════════════
   1. SUBMIT QUIZ ATTEMPT
   POST /api/attempts
   Taker only.
   Body: { quizId, answers: [{ questionId, selectedOption }],
           timeTaken, timedOut, tabSwitchCount }
═══════════════════════════════════════════════════════════════════ */
export const submitAttempt = async (req, res) => {
  try {
    const {
      quizId,
      answers       = [],
      timeTaken     = 0,
      timedOut      = false,
      tabSwitchCount = 0,
    } = req.body

    if (!quizId) {
      return res.status(400).json({ message: 'quizId is required' })
    }

    // Fetch quiz WITH correct answers (we need them to score)
    const quiz = await Quiz.findOne({
      _id:       quizId,
      status:    'published',
      isDeleted: { $ne: true },
    })

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or not published' })
    }

    // Prevent duplicate attempt — unique index on (quiz, user)
    const existingAttempt = await Attempt.findOne({
      quiz: quizId,
      user: req.user._id,
    })

    if (existingAttempt) {
      return res.status(409).json({
        message:   'You have already attempted this quiz',
        attemptId: existingAttempt._id,
      })
    }

    /* ── Score calculation ──────────────────────────────────────
       Compare each submitted answer against the stored
       correctAnswer field. Build a scored answers array.     ── */
    let correctCount = 0

    const scoredAnswers = quiz.questions.map((question) => {
      const submitted = answers.find(
        (a) => a.questionId?.toString() === question._id.toString()
      )

      const selectedOption = submitted?.selectedOption || null
      const isCorrect      =
        selectedOption !== null &&
        selectedOption === question.correctAnswer

      if (isCorrect) correctCount++

      return {
        questionId:     question._id,
        selectedOption,
        isCorrect,
      }
    })

    const totalQuestions = quiz.questions.length
    const score          = Math.round((correctCount / totalQuestions) * 100)

    /* ── Anti-cheat penalty ─────────────────────────────────────
       If user switched tabs 3+ times, apply a 10-point penalty.
       Score floor is 0 — never go negative.                  ── */
    const penalised    = tabSwitchCount >= 3
    const finalScore   = penalised ? Math.max(0, score - 10) : score

    /* ── Save attempt ───────────────────────────────────────── */
    const attempt = await Attempt.create({
      quiz:           quiz._id,
      user:           req.user._id,
      answers:        scoredAnswers,
      score:          finalScore,
      correctCount,
      totalQuestions,
      timeTaken,
      timedOut,
      tabSwitchCount,
      penalised,
    })

    // Increment the quiz's totalAttempts counter
    await Quiz.findByIdAndUpdate(quizId, { $inc: { totalAttempts: 1 } })

    res.status(201).json({
      message:   'Attempt submitted successfully',
      attemptId: attempt._id,
      score:     finalScore,
      correctCount,
      totalQuestions,
      penalised,
    })

  } catch (error) {
    // Duplicate key error from unique index
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You have already attempted this quiz',
      })
    }
    console.error('submitAttempt error:', error)
    res.status(500).json({ message: 'Server error submitting attempt' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   2. GET LEADERBOARD FOR A QUIZ
   GET /api/attempts/:quizId/leaderboard
   Public — anyone can view the leaderboard.
   Sorted by: highest score first, then fastest time (tie-breaker).
═══════════════════════════════════════════════════════════════════ */
export const getLeaderboard = async (req, res) => {
  try {
    const { quizId } = req.params

    // Verify quiz exists and is not deleted
    const quiz = await Quiz.findOne({
      _id:       quizId,
      isDeleted: { $ne: true },
    }).select('title')

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' })
    }

    /* ── Leaderboard query ──────────────────────────────────────
       The compound index { quiz: 1, score: -1, timeTaken: 1 }
       makes this query extremely fast even with thousands of
       attempts.                                               ── */
    const attempts = await Attempt.find({ quiz: quizId })
      .populate('user', 'username')
      .sort({ score: -1, timeTaken: 1 })   // highest score, then fastest
      .limit(50)                            // top 50 entries
      .select('user score timeTaken correctCount totalQuestions penalised timedOut createdAt')

    const leaderboard = attempts.map((attempt, index) => ({
      rank:           index + 1,
      userId:         attempt.user._id,
      username:       attempt.user.username,
      score:          attempt.score,
      correctCount:   attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      timeTaken:      attempt.timeTaken,
      penalised:      attempt.penalised,
      timedOut:       attempt.timedOut,
      attemptedAt:    attempt.createdAt,
    }))

    res.status(200).json({
      quizTitle:  quiz.title,
      totalEntries: leaderboard.length,
      leaderboard,
    })

  } catch (error) {
    console.error('getLeaderboard error:', error)
    res.status(500).json({ message: 'Server error fetching leaderboard' })
  }
}

/* ══════════════════════════════════════════════════════════════════
   3. GET DETAILED ATTEMPT RESULT
   GET /api/attempts/:attemptId/result
   Protected — only the user who made the attempt can view it.
   Returns full breakdown: score, time, per-question analysis,
   correct answers, and creator's explanations for wrong answers.
═══════════════════════════════════════════════════════════════════ */
export const getAttemptResult = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId)
      .populate('user',  'username')
      .populate('quiz',  'title questions timeLimit creator')

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' })
    }

    // Only the attempt owner can view their result
    if (attempt.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised to view this result' })
    }

    /* ── Build per-question breakdown ───────────────────────────
       Merge attempt answers with quiz question data.
       Reveal correct answers and explanations only now —
       the quiz was already submitted so there's no cheat risk.  */
    const breakdown = attempt.quiz.questions.map((question) => {
      const userAnswer = attempt.answers.find(
        (a) => a.questionId.toString() === question._id.toString()
      )

      return {
        questionId:     question._id,
        questionText:   question.text,
        options:        question.options,
        correctAnswer:  question.correctAnswer,
        selectedOption: userAnswer?.selectedOption || null,
        isCorrect:      userAnswer?.isCorrect      || false,
        // Only show explanation for wrong / unanswered questions
        explanation:
          !userAnswer?.isCorrect && question.explanation
            ? question.explanation
            : null,
      }
    })

    /* ── Find user's rank on the leaderboard ────────────────── */
    const betterAttempts = await Attempt.countDocuments({
      quiz:  attempt.quiz._id,
      score: { $gt: attempt.score },
    })

    const sameScoreFaster = await Attempt.countDocuments({
      quiz:      attempt.quiz._id,
      score:     attempt.score,
      timeTaken: { $lt: attempt.timeTaken },
    })

    const rank = betterAttempts + sameScoreFaster + 1

    res.status(200).json({
      attemptId:      attempt._id,
      quizTitle:      attempt.quiz.title,
      score:          attempt.score,
      correctCount:   attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      timeTaken:      attempt.timeTaken,
      timedOut:       attempt.timedOut,
      penalised:      attempt.penalised,
      tabSwitchCount: attempt.tabSwitchCount,
      rank,
      breakdown,
      submittedAt:    attempt.createdAt,
    })

  } catch (error) {
    console.error('getAttemptResult error:', error)
    res.status(500).json({ message: 'Server error fetching result' })
  }
}