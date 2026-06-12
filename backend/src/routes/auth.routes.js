import { Router }                              from 'express'
import { register, login, refresh, logout, getMe } from '../controllers/auth.controller.js'
import verifyToken                             from '../middleware/auth.middleware.js'

const router = Router()

/**
 * Public routes — no token needed
 */
router.post('/register', register)
router.post('/login',    login)
router.post('/refresh',  refresh)   // reads HttpOnly cookie
router.post('/logout',   logout)    // reads HttpOnly cookie

/**
 * Protected route — requires valid access token
 * verifyToken reads Authorization: Bearer <token>
 */
router.get('/me', verifyToken, getMe)

export default router