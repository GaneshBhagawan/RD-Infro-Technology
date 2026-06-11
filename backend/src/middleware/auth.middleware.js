import jwt    from 'jsonwebtoken'
import User   from '../models/User.js'

/**
 * verifyToken
 * Reads the Bearer token from the Authorization header,
 * verifies it, fetches the user from DB, and attaches
 * the user object to req.user for downstream use.
 */
const verifyToken = async (req, res, next) => {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    // 2. Verify the token signature + expiry
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    // 3. Fetch fresh user from DB (catches deleted/banned users)
    const user = await User.findById(decoded.userId).select('-password -refreshToken')
    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    // 4. Attach user to request object
    req.user = user
    next()

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' })
    }
    return res.status(500).json({ message: 'Auth error' })
  }
}

export default verifyToken