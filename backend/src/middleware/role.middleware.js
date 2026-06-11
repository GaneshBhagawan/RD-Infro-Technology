/**
 * requireRole
 * Factory function — returns a middleware that checks
 * if req.user has the required role.
 *
 * Usage on a route:
 *   router.post('/', verifyToken, requireRole('creator'), handler)
 *
 * Always place verifyToken BEFORE requireRole.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      })
    }

    next()
  }
}

export default requireRole