import Quiz from '../models/Quiz.js'
import groq from '../utils/groqClient.js'

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

/* ══════════════════════════════════════════════════════════════════
   9. AI-POWERED QUIZ GENERATION
   POST /api/quizzes/generate-ai
   Creator only.

   Body: {
     prompt:      "10 chemistry questions for graduation level",
     timeLimit:   600,     (optional, default 600)
     difficulty:  "medium" (optional: easy | medium | hard)
   }

   Flow:
   1. Build a strict system prompt that forces JSON output
   2. Send user prompt + system prompt to Groq (LLaMA 3.3-70B)
   3. Parse and validate the JSON response
   4. Save as a new draft quiz in MongoDB
   5. Return the saved quiz to the frontend
═══════════════════════════════════════════════════════════════════ */
export const generateAIQuiz = async (req, res) => {
  try {
    const {
      prompt,
      timeLimit  = 600,
      difficulty = 'medium',
    } = req.body

    /* ── Input validation ─────────────────────────────────────── */
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({
        message: 'Prompt must be at least 10 characters long',
      })
    }

    if (prompt.trim().length > 500) {
      return res.status(400).json({
        message: 'Prompt must be under 500 characters',
      })
    }

    /* ══════════════════════════════════════════════════════════
       SYSTEM PROMPT
       This is the most important part of AI generation.
       It forces the LLM to return ONLY valid JSON —
       no preamble, no markdown, no extra text.
       Any deviation breaks JSON.parse() and we catch it.
    ══════════════════════════════════════════════════════════ */
    // This endpoint generates quizzes based on the provided difficulty,
    // but keeps the question count decided by the AI / user intent.
    const systemPrompt = `

You are a professional quiz generation engine. Your ONLY job is to output
a single valid JSON object — nothing else. No markdown, no code fences,
no explanations, no preamble, no trailing text. Just raw JSON.

The JSON object you output must match this exact schema:

{
  "title": "string — a clear descriptive quiz title (5–80 chars)",
  "description": "string — one sentence describing the quiz (10–150 chars)",
  "questions": [
    {
      "text": "string — the full question text (10–300 chars)",
      "options": [
        { "label": "A", "text": "string — option text (1–100 chars)" },
        { "label": "B", "text": "string — option text (1–100 chars)" },
        { "label": "C", "text": "string — option text (1–100 chars)" },
        { "label": "D", "text": "string — option text (1–100 chars)" }
      ],
      "correctAnswer": "A" | "B" | "C" | "D",
      "explanation": "string — why this answer is correct (10–300 chars)"
    }
  ]
}

STRICT RULES you must never break:
1. Output ONLY the raw JSON object — no markdown, no \`\`\`json fences, nothing else.
2. Every question must have EXACTLY 4 options labelled A, B, C, D.
3. correctAnswer must be exactly one of: "A", "B", "C", or "D".
4. Every question must have an explanation.
5. All option labels must be uppercase single letters: A, B, C, D.
6. Questions must be factually accurate and unambiguous.
7. Options must be distinct — no two options should mean the same thing.
8. The correct answer must actually be correct — double-check every answer.
9. Difficulty level: ${difficulty}. You MUST change question difficulty substantially:
   - easy: simple recall/basic concepts. Short reasoning. Distractors should be obviously wrong.
   - medium: application/interpretation with 2-step reasoning. Distractors should be plausible.
   - hard: advanced reasoning/analysis. Prefer scenario-based or multi-condition questions. Distractors should be tricky/nuanced.
10. Do not number the questions in the text field (no "1.", "2." etc.).
11. Explanations must reflect the difficulty (easy: brief concept; medium: why alternatives fail; hard: deeper rationale).
12. Generate as many questions as needed to satisfy the user's request (use your best judgment; do not force a fixed count).

If you cannot generate the quiz for any reason (inappropriate topic, etc.),
output this exact JSON and nothing else:
{ "error": "Cannot generate quiz for this topic" }
`.trim()

    /* ── Call Groq API ────────────────────────────────────────── */
    console.log(`🤖 Generating AI quiz: "${prompt.trim()}"`)

    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.7,      // slight creativity — not too random
      max_tokens:  6500,     // support larger quizzes for medium/hard
      messages: [

        {
          role:    'system',
          content: systemPrompt,
        },
        {
          role:    'user',
          content: `Generate a quiz based on this request: "${prompt.trim()}"`,
        },
      ],
    })

    /* ── Extract raw text from Groq response ─────────────────── */
    const rawText = completion.choices?.[0]?.message?.content?.trim()

    if (!rawText) {
      return res.status(502).json({
        message: 'AI returned an empty response. Please try again.',
      })
    }

    /* ── Clean and parse JSON ─────────────────────────────────── */
    // Strip any accidental markdown fences the model may add
    // despite being told not to — defensive parsing
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i,     '')
      .replace(/\s*```$/,      '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('AI JSON parse failed. Raw output:\n', rawText)
      return res.status(502).json({
        message:
          'AI returned malformed JSON. Please rephrase your prompt and try again.',
      })
    }

    /* ── Check if AI refused the topic ───────────────────────── */
    if (parsed.error) {
      return res.status(422).json({
        message: `AI declined: ${parsed.error}`,
      })
    }

    /* ── Validate structure ───────────────────────────────────── */
    if (!parsed.title || !Array.isArray(parsed.questions)) {
      return res.status(502).json({
        message: 'AI response is missing required fields (title or questions).',
      })
    }

    if (parsed.questions.length === 0) {
      return res.status(502).json({
        message: 'AI returned no questions. Please try a different prompt.',
      })
    }

    /* ── Validate every question ──────────────────────────────── */
    const validLabels = ['A', 'B', 'C', 'D']

    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i]

      if (!q.text || typeof q.text !== 'string') {
        return res.status(502).json({
          message: `Question ${i + 1} is missing its text field.`,
        })
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return res.status(502).json({
          message: `Question ${i + 1} must have exactly 4 options.`,
        })
      }

      if (!validLabels.includes(q.correctAnswer)) {
        return res.status(502).json({
          message: `Question ${i + 1} has an invalid correctAnswer: "${q.correctAnswer}".`,
        })
      }

      // Ensure all 4 option labels exist
      const labels = q.options.map((o) => o.label)
      const hasAll = validLabels.every((l) => labels.includes(l))
      if (!hasAll) {
        return res.status(502).json({
          message: `Question ${i + 1} is missing one or more option labels (A/B/C/D).`,
        })
      }
    }

    /* ── Save to MongoDB as a draft quiz ──────────────────────── */
    const quiz = await Quiz.create({
      title:        parsed.title.trim(),
      description:  parsed.description?.trim() || '',
      questions:    parsed.questions.map((q) => ({
        text:          q.text.trim(),
        options:       q.options.map((o) => ({
          label: o.label.toUpperCase(),
          text:  o.text.trim(),
        })),
        correctAnswer: q.correctAnswer.toUpperCase(),
        explanation:   q.explanation?.trim() || '',
      })),
      timeLimit:    timeLimit || 600,
      status:       'draft',         // always saved as draft first
      creator:      req.user._id,
      aiGenerated:  true,            // flag so dashboard can show AI badge
    })

    console.log(`✅ AI quiz saved: "${quiz.title}" (${quiz.questions.length} questions)`)

    res.status(201).json({
      message:   `AI generated "${quiz.title}" with ${quiz.questions.length} questions. Saved as draft.`,
      quiz,
    })

  } catch (error) {
    /* ── Groq-specific error handling ───────────────────────── */
    if (error?.status === 429) {
      return res.status(429).json({
        message: 'Groq rate limit reached. Please wait a moment and try again.',
      })
    }

    if (error?.status === 401) {
      return res.status(500).json({
        message: 'Invalid Groq API key. Check your .env file.',
      })
    }

    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: 'Cannot reach Groq API. Check your internet connection.',
      })
    }

    console.error('generateAIQuiz error:', error)
    res.status(500).json({ message: 'Server error during AI generation' })
  }
}