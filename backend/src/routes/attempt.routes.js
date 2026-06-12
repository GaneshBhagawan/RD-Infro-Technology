import { Router }        from 'express'
import {
  submitAttempt,
  getLeaderboard,
  getAttemptResult,
}                        from '../controllers/attempt.controller.js'
import verifyToken       from '../middleware/auth.middleware.js'
import requireRole       from '../middleware/role.middleware.js'

const router = Router()

/* ── Submit a quiz attempt ──────────────────────────────────────── */
// Only takers can submit attempts
router.post(
  '/',
  verifyToken,
  requireRole('taker'),
  submitAttempt
)

/* ── Get leaderboard for a quiz ─────────────────────────────────── */
// Public — anyone can view leaderboards, even without an account
router.get('/:quizId/leaderboard', getLeaderboard)

/* ── Get detailed result for a specific attempt ─────────────────── */
// Protected — only the user who made the attempt can see their result
router.get(
  '/:attemptId/result',
  verifyToken,
  getAttemptResult
)

export default router