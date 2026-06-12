/**
 * requireRole middleware factory
 *
 * Returns a middleware that checks if the authenticated user
 * has one of the allowed roles.
 *
 * IMPORTANT: Always place verifyToken BEFORE requireRole
 * because verifyToken attaches req.user.
 *
 * Usage examples:
 *   router.post('/', verifyToken, requireRole('creator'), createQuiz)
 *   router.get('/',  verifyToken, requireRole('creator', 'taker'), listQuizzes)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {

    // Safety check — verifyToken must run first
    if (!req.user) {
      return res.status(401).json({
        message: 'Not authenticated. Run verifyToken before requireRole.',
      })
    }

    const userRole = req.user.role

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. This action requires the '${allowedRoles.join("' or '")}' role. Your role is '${userRole}'.`,
      })
    }

    next()
  }
}

export default requireRole