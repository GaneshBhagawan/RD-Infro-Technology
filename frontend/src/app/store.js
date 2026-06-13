import { configureStore } from '@reduxjs/toolkit'
import authReducer        from '../features/auth/authSlice.js'
import quizReducer        from '../features/quiz/quizSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    quiz: quizReducer,
  },
  /* ── Disable serializable check for tokens ─────────────────────
     JWT strings are serializable but this suppresses any warnings
     if you ever put a Date object in state during development.  ── */
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export default store