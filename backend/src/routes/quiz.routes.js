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
  generateAIQuiz,
}                          from '../controllers/quiz.controller.js'
import verifyToken         from '../middleware/auth.middleware.js'
import requireRole         from '../middleware/role.middleware.js'
import jwt                 from 'jsonwebtoken'
import User                from '../models/User.js'

const router = Router()

/* ══════════════════════════════════════════════════════════════════
   ROUTE ORDER MATTERS IN EXPRESS.
   More specific paths must come BEFORE wildcard paths like /:id.
═══════════════════════════════════════════════════════════════════ */

/* ── Public routes ──────────────────────────────────────────────── */

// Browse all published quizzes — no login needed
router.get('/', getPublishedQuizzes)

/* ── Creator-only: specific string paths (BEFORE /:id) ─────────── */

// AI quiz generation — must be before /:id
router.post(
  '/generate-ai',
  verifyToken,
  requireRole('creator'),
  generateAIQuiz
)

// Get all of the logged-in creator's quizzes (dashboard)
router.get(
  '/my/quizzes',
  verifyToken,
  requireRole('creator'),
  getMyQuizzes
)

// Create a new quiz manually
router.post(
  '/',
  verifyToken,
  requireRole('creator'),
  createQuiz
)

/* ── Routes with /:id wildcard (AFTER all specific paths) ───────── */

// Get single quiz — optional auth (creator sees answers, taker does not)
router.get('/:id', optionalAuth, getQuizById)

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

/* ── Clean optionalAuth helper ──────────────────────────────────────
   Uses the already imported verifyToken middleware safely.
   If no token is sent, it smoothly passes the user forward as a guest.
─────────────────────────────────────────────────────────────────── */
async function optionalAuth(req, _res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next() // Clear to proceed as anonymous public taker
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    req.user = await User.findById(decoded.userId).select('-password -refreshToken')
  } catch {
    req.user = null
  } finally {
    next()
  }
}

export default router
