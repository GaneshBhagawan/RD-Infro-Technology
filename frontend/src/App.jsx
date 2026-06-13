import { useEffect }        from 'react'
import { Routes, Route }    from 'react-router-dom'
import { useDispatch }      from 'react-redux'
import axiosInstance        from './api/axiosInstance.js'
import { setCredentials, clearCredentials, setLoading } from './features/auth/authSlice.js'

import AuroraBackground  from './components/ui/AuroraBackground.jsx'
import Navbar            from './components/layout/Navbar.jsx'
import ProtectedRoute    from './components/layout/ProtectedRoute.jsx'

/* ── Page imports ───────────────────────────────────────────────── */
/* These files do not exist yet — you will create them in Phase 7 & 8.
   Vite will show errors until then — that is expected and normal.   */
import HomePage          from './pages/HomePage.jsx'
import LoginPage         from './pages/LoginPage.jsx'
import RegisterPage      from './pages/RegisterPage.jsx'
import BrowsePage        from './pages/BrowsePage.jsx'
import DashboardPage     from './pages/DashboardPage.jsx'
import QuizCreatorPage   from './pages/QuizCreatorPage.jsx'
import QuizTakerPage     from './pages/QuizTakerPage.jsx'
import ResultPage        from './pages/ResultPage.jsx'
import LeaderboardPage   from './pages/LeaderboardPage.jsx'
import UnauthorisedPage  from './pages/UnauthorisedPage.jsx'
import NotFoundPage      from './pages/NotFoundPage.jsx'

/**
 * App
 * Root component. Handles:
 *   1. Silent token refresh on every page load (session persistence)
 *   2. Route definitions
 *   3. Aurora background + Navbar layout wrapper
 */
const App = () => {
  const dispatch = useDispatch()

  /* ── Silent refresh on app boot ──────────────────────────────
     On every page load / hard refresh, the access token is gone
     from Redux memory. This effect calls /auth/refresh once.
     If the HttpOnly cookie is valid, we get a new access token
     and the user stays logged in without seeing the login page.  */
  useEffect(() => {
    const silentRefresh = async () => {
      dispatch(setLoading(true))
      try {
        const { data } = await axiosInstance.post('/auth/refresh')
        // Also fetch current user profile
        const me = await axiosInstance.get('/auth/me', {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        })
        dispatch(
          setCredentials({
            accessToken: data.accessToken,
            user:        me.data.user,
          })
        )
      } catch {
        // No valid cookie — user is not logged in, that is fine
        dispatch(clearCredentials())
      }
    }

    silentRefresh()
  }, [dispatch])

  return (
    <div
      style={{
        minHeight:  '100vh',
        background: '#030712',
        position:   'relative',
      }}
    >
      {/* Fixed aurora blobs — behind everything */}
      <AuroraBackground />

      {/* Sticky top navbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <Navbar />
      </div>

      {/* Page content — above aurora blobs */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <Routes>

          {/* ── Public routes ─────────────────────────────── */}
          <Route path="/"        element={<HomePage />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/browse"  element={<BrowsePage />} />

          {/* Leaderboard is public — anyone can view */}
          <Route
            path="/leaderboard/:quizId"
            element={<LeaderboardPage />}
          />

          {/* ── Creator-only routes ────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="creator">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/create"
            element={
              <ProtectedRoute role="creator">
                <QuizCreatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id/edit"
            element={
              <ProtectedRoute role="creator">
                <QuizCreatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id/analytics"
            element={
              <ProtectedRoute role="creator">
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ── Taker-only routes ─────────────────────────── */}
          <Route
            path="/quiz/:id/take"
            element={
              <ProtectedRoute role="taker">
                <QuizTakerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id/result/:attemptId"
            element={
              <ProtectedRoute role="taker">
                <ResultPage />
              </ProtectedRoute>
            }
          />

          {/* ── Fallback routes ───────────────────────────── */}
          <Route path="/unauthorised" element={<UnauthorisedPage />} />
          <Route path="*"            element={<NotFoundPage />} />

        </Routes>
      </main>
    </div>
  )
}

export default App