import mongoose from 'mongoose'

/* ── Option sub-schema ──────────────────────────────────── */
const optionSchema = new mongoose.Schema(
  {
    label: {
      type:     String,
      required: true,
      enum:     ['A', 'B', 'C', 'D'],
    },
    text: {
      type:     String,
      required: true,
      trim:     true,
    },
  },
  { _id: false }
)

/* ── Question sub-schema ────────────────────────────────── */
const questionSchema = new mongoose.Schema(
  {
    text: {
      type:     String,
      required: [true, 'Question text is required'],
      trim:     true,
    },
    options: {
      type:     [optionSchema],
      validate: {
        validator: (arr) => arr.length === 4,
        message:  'Each question must have exactly 4 options',
      },
    },
    correctAnswer: {
      type:     String,
      required: true,
      enum:     ['A', 'B', 'C', 'D'],
    },
    explanation: {
      type:    String,
      trim:    true,
      default: '',           // creator can optionally explain the answer
    },
  },
  { _id: true }
)

/* ── Quiz main schema ───────────────────────────────────── */
const quizSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  [true, 'Quiz title is required'],
      trim:      true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title must be at most 100 characters'],
    },
    description: {
      type:    String,
      trim:    true,
      default: '',
    },
    creator: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    questions: {
      type:     [questionSchema],
      validate: {
        validator: (arr) => arr.length >= 1,
        message:  'Quiz must have at least 1 question',
      },
    },
    timeLimit: {
      type:    Number,
      default: 600,          // seconds — 10 minutes default
      min:     [60, 'Time limit must be at least 60 seconds'],
    },
    status: {
      type:    String,
      enum:    ['draft', 'published'],
      default: 'draft',
    },
    isDeleted: {
      type:    Boolean,
      default: false,        // soft delete flag — never hard delete
    },
    aiGenerated: {
      type:    Boolean,
      default: false,
    },
    totalAttempts: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true }
)

/* ── Indexes for fast queries ───────────────────────────── */
quizSchema.index({ status: 1, isDeleted: 1 })
quizSchema.index({ creator: 1, isDeleted: 1 })

const Quiz = mongoose.model('Quiz', quizSchema)
export default Quiz