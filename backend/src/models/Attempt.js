import mongoose from 'mongoose'

/* ── Per-question answer sub-schema ─────────────────────── */
const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type:     mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedOption: {
      type: String,
      enum: ['A', 'B', 'C', 'D', null],  // null = unanswered (time ran out)
      default: null,
    },
    isCorrect: {
      type:    Boolean,
      default: false,
    },
  },
  { _id: false }
)

/* ── Attempt main schema ────────────────────────────────── */
const attemptSchema = new mongoose.Schema(
  {
    quiz: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Quiz',
      required: true,
    },
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    answers: [answerSchema],
    score: {
      type:    Number,
      default: 0,           // percentage 0-100
    },
    correctCount: {
      type:    Number,
      default: 0,
    },
    totalQuestions: {
      type:    Number,
      required: true,
    },
    timeTaken: {
      type:    Number,
      default: 0,           // seconds taken to complete
    },
    timedOut: {
      type:    Boolean,
      default: false,       // true if timer forced submission
    },
    tabSwitchCount: {
      type:    Number,
      default: 0,           // anti-cheat: how many times user switched tabs
    },
    penalised: {
      type:    Boolean,
      default: false,       // true if tab switch limit was exceeded
    },
  },
  { timestamps: true }
)

/* ── Compound index: leaderboard queries ────────────────── */
// Sort by quiz, then highest score, then fastest time
attemptSchema.index({ quiz: 1, score: -1, timeTaken: 1 })

// One attempt per user per quiz — prevents duplicate entries
attemptSchema.index({ quiz: 1, user: 1 }, { unique: true })

const Attempt = mongoose.model('Attempt', attemptSchema)
export default Attempt