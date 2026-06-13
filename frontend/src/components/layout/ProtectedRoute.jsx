import { Navigate, useLocation } from 'react-router-dom'
import { useSelector }           from 'react-redux'
import {
  selectIsAuthenticated,
  selectIsLoading,
  selectCurrentUser,
}                                from '../../features/auth/authSlice.js'
import Spinner                   from '../ui/Spinner.jsx'

/**
 * ProtectedRoute
 * Wraps any route that requires authentication (and optionally a role).
 *
 * Props:
 *   role — 'creator' | 'taker' | undefined
 *          If undefined, only checks authentication.
 *
 * Behaviour:
 *   Loading        → shows centred spinner (while /auth/refresh is in flight)
 *   Not logged in  → redirects to /login (saves intended path in state)
 *   Wrong role     → redirects to /unauthorised
 *   OK             → renders children
 *
 * Usage in App.jsx:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute role="creator"><DashboardPage /></ProtectedRoute>
 *   }/>
 */
const ProtectedRoute = ({ children, role }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading       = useSelector(selectIsLoading)
  const user            = useSelector(selectCurrentUser)
  const location        = useLocation()

  /* ── Still checking auth (app boot / token refresh in flight) ── */
  if (isLoading) {
    return (
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      '80vh',
          flexDirection:  'column',
          gap:            '16px',
        }}
      >
        <Spinner size="lg" />
        <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '14px' }}>
          Checking session…
        </p>
      </div>
    )
  }

  /* ── Not logged in → redirect to /login ────────────────────── */
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}   // so login page can redirect back
        replace
      />
    )
  }

  /* ── Wrong role → redirect to /unauthorised ─────────────────── */
  if (role && user?.role !== role) {
    return <Navigate to="/unauthorised" replace />
  }

  /* ── All checks passed ─────────────────────────────────────── */
  return children
}

export default ProtectedRoute