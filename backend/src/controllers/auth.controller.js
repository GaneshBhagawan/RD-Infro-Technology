import jwt    from 'jsonwebtoken'
import User   from '../models/User.js'

/* ── Helpers ────────────────────────────────────────────────────────── */

/**
 * Signs a short-lived access token (15 min).
 * Stored in frontend memory (Redux), sent in Authorization header.
 */
const signAccessToken = (userId, role) =>
  jwt.sign(
    { userId, role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  )

/**
 * Signs a long-lived refresh token (7 days).
 * Stored in HttpOnly cookie — never readable by JS.
 */
const signRefreshToken = (userId) =>
  jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  )

/**
 * Sets the refresh token as a secure HttpOnly cookie.
 * HttpOnly = JS cannot read it → safe from XSS attacks.
 * SameSite + Secure settings change based on environment.
 */
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === 'production',
    sameSite:  process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:    7 * 24 * 60 * 60 * 1000,    // 7 days in milliseconds
    path:      '/',
  })
}

/* ── REGISTER ───────────────────────────────────────────────────────── */

/**
 * POST /api/auth/register
 * Creates a new user. Password hashing is handled by the
 * pre-save hook in User.js — we just pass the plain text here.
 */
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Check for duplicate email or username
    const existing = await User.findOne({
      $or: [{ email }, { username }],
    })

    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username'
      return res.status(409).json({ message: `${field} already in use` })
    }

    // Only allow 'creator' or 'taker' — default to 'taker' for safety
    const allowedRoles = ['creator', 'taker']
    const assignedRole = allowedRoles.includes(role) ? role : 'taker'

    // Create user (password hashed by pre-save hook in User model)
    const user = await User.create({
      username,
      email,
      password,
      role: assignedRole,
    })

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id:       user._id,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
    })

  } catch (error) {
    // Mongoose validation errors (minlength, match, etc.)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message)
      return res.status(400).json({ message: messages.join(', ') })
    }
    console.error('Register error:', error)
    res.status(500).json({ message: 'Server error during registration' })
  }
}

/* ── LOGIN ──────────────────────────────────────────────────────────── */

/**
 * POST /api/auth/login
 * Verifies credentials, issues access token + refresh cookie.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    // Must use .select('+password') because password has select: false in schema
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      // Use generic message — don't reveal whether email exists
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Use the comparePassword method defined on the User model
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Generate both tokens
    const accessToken  = signAccessToken(user._id, user.role)
    const refreshToken = signRefreshToken(user._id)

    // Save refresh token hash to DB so we can invalidate it on logout
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    // Set refresh token in HttpOnly cookie
    setRefreshCookie(res, refreshToken)

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id:       user._id,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error during login' })
  }
}

/* ── REFRESH TOKEN ──────────────────────────────────────────────────── */

/**
 * POST /api/auth/refresh
 * Reads the refresh token from the HttpOnly cookie,
 * verifies it, and issues a new access token.
 * Called automatically by axiosInstance in the frontend
 * when a 401 response is received.
 */
export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken

    if (!token) {
      return res.status(401).json({ message: 'No refresh token' })
    }

    // Verify the refresh token signature
    let decoded
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' })
    }

    // Find user and check that the stored token matches
    // (this lets us invalidate tokens on logout)
    const user = await User.findById(decoded.userId).select('+refreshToken')

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: 'Refresh token mismatch' })
    }

    // Issue new access token
    const newAccessToken = signAccessToken(user._id, user.role)

    res.status(200).json({
      accessToken: newAccessToken,
    })

  } catch (error) {
    console.error('Refresh error:', error)
    res.status(500).json({ message: 'Server error during token refresh' })
  }
}

/* ── LOGOUT ─────────────────────────────────────────────────────────── */

/**
 * POST /api/auth/logout
 * Clears the refresh token from DB and the cookie from browser.
 * The access token expires on its own (15 min) — we can't revoke it,
 * but the frontend deletes it from Redux memory immediately.
 */
export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken

    if (token) {
      // Remove token from DB so it can't be reused
      await User.findOneAndUpdate(
        { refreshToken: token },
        { refreshToken: null },
        { validateBeforeSave: false }
      )
    }

    // Clear the cookie from browser
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path:     '/',
    })

    res.status(200).json({ message: 'Logged out successfully' })

  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ message: 'Server error during logout' })
  }
}

/* ── GET CURRENT USER (ME) ──────────────────────────────────────────── */

/**
 * GET /api/auth/me
 * Returns the current logged-in user's profile.
 * Protected route — requires valid access token.
 * req.user is attached by verifyToken middleware.
 */
export const getMe = async (req, res) => {
  try {
    // req.user is already attached by verifyToken middleware
    // Re-fetch to get the most up-to-date data
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.status(200).json({
      user: {
        id:        user._id,
        username:  user.username,
        email:     user.email,
        role:      user.role,
        createdAt: user.createdAt,
      },
    })

  } catch (error) {
    console.error('GetMe error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}