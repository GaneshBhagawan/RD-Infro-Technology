import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import connectDB from './src/config/db.js'

import authRoutes    from './src/routes/auth.routes.js'
import quizRoutes    from './src/routes/quiz.routes.js'
import attemptRoutes from './src/routes/attempt.routes.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 5000

/* ── Middleware ─────────────────────────────────────────── */
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,                  // allow cookies cross-origin
}))
app.use(express.json())
app.use(cookieParser())

/* ── Routes ─────────────────────────────────────────────── */
app.use('/api/auth',     authRoutes)
app.use('/api/quizzes',  quizRoutes)
app.use('/api/attempts', attemptRoutes)

/* ── Health check ───────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Quiz Maker API is running 🚀' })
})

/* ── 404 catch-all ──────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

/* ── Global error handler ───────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message)
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  })
})

/* ── Start ──────────────────────────────────────────────── */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`)
  })
})