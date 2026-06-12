import { Router }          from 'express'
import {
  createQuiz,
  getPublishedQuizzes,
  getMyQuizzes,
  getQuizById,
  updateQuiz,
  togglePublish,
  deleteQuiz,
  getQuizAnalytics,
}                          from '../controllers/quiz.controller.js'
import verifyToken         from '../middleware/auth.middleware.js'
import requireRole         from '../middleware/role.middleware.js'

const router = Router()

/* ── Public routes ──────────────────────────────────────────────── */

// Browse all published quizzes — no login needed
router.get('/', getPublishedQuizzes)

// Get single quiz — optional auth (creator sees answers, taker doesn't)
// We pass verifyToken but make it optional via a wrapper
router.get('/:id', optionalAuth, getQuizById)

/* ── Creator-only routes ────────────────────────────────────────── */

// Create a new quiz
router.post(
  '/',
  verifyToken,
  requireRole('creator'),
  createQuiz
)

// Get all of the logged-in creator's quizzes (dashboard)
router.get(
  '/my/quizzes',
  verifyToken,
  requireRole('creator'),
  getMyQuizzes
)

// Update quiz content
router.put(
  '/:id',
  verifyToken,
  requireRole('creator'),
  updateQuiz
)

// Toggle draft ↔ published
router.patch(
  '/:id/publish',
  verifyToken,
  requireRole('creator'),
  togglePublish
)

// Soft delete
router.delete(
  '/:id',
  verifyToken,
  requireRole('creator'),
  deleteQuiz
)

// Performance analytics
router.get(
  '/:id/analytics',
  verifyToken,
  requireRole('creator'),
  getQuizAnalytics
)

/* ── optionalAuth helper ────────────────────────────────────────────
   Used on GET /:id so creators can see correct answers when editing
   their own quiz, while unauthenticated takers see it without answers.
   Unlike verifyToken, this never returns a 401 — it just skips.   ── */
function optionalAuth (req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()   // no token — continue without req.user
  }

  // Reuse verifyToken logic but swallow errors
  import('../middleware/auth.middleware.js')
    .then(({ default: verifyToken }) => {
      verifyToken(req, res, (err) => {
        if (err) return next()   // invalid token — just continue without user
        next()
      })
    })
    .catch(() => next())
}

export default router