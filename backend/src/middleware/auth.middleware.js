import jwt  from 'jsonwebtoken'
import User from '../models/User.js'

/**
 * verifyToken middleware
 *
 * 1. Reads the Authorization header: "Bearer <token>"
 * 2. Verifies the JWT signature and expiry
 * 3. Fetches the user from MongoDB
 * 4. Attaches user to req.user for downstream controllers
 *
 * Usage:  router.get('/protected', verifyToken, myController)
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']

    // Header must exist and follow "Bearer <token>" format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Access denied. No token provided.',
      })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'Access denied. Token missing.' })
    }

    // Verify signature and decode — throws if expired or tampered
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    // Fetch fresh user from DB
    // This catches edge cases: deleted users, role changes
    const user = await User.findById(decoded.userId).select(
      '-password -refreshToken'
    )

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }

    // Attach to request so controllers can use req.user
    req.user = user
    next()

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Frontend axiosInstance intercepts this 401 and
      // calls /api/auth/refresh automatically
      return res.status(401).json({ message: 'Token expired.' })
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' })
    }

    console.error('Auth middleware error:', error)
    return res.status(500).json({ message: 'Authentication error.' })
  }
}

export default verifyToken