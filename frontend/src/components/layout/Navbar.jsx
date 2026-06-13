import { Link, useNavigate, useLocation } from 'react-router-dom'
import useAuth                             from '../../hooks/useAuth.js'

/**
 * Navbar
 * Adapts its links based on auth state and user role.
 *
 * Unauthenticated : Browse | Login | Register
 * Creator         : Browse | Dashboard | + Create Quiz | [username] | Logout
 * Taker           : Browse | Leaderboard | [username] | Logout
 */
const Navbar = () => {
  const { user, isAuthenticated, isCreator, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + '/')

  return (
    <nav
      style={{
        position:       'relative',
        zIndex:         50,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 24px',
        height:         '60px',
        background:     'rgba(3, 7, 18, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom:   '0.5px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <Link
        to="/"
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '8px',
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width:        '30px',
            height:       '30px',
            borderRadius: '8px',
            background:   'linear-gradient(135deg, #7c3aed, #0891b2)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     '15px',
            fontWeight:   '500',
            color:        '#fff',
            flexShrink:   0,
          }}
        >
          Q
        </div>
        <span
          style={{
            fontSize:   '16px',
            fontWeight: '500',
            color:      '#f1f5f9',
          }}
        >
          QuizMaker
        </span>
      </Link>

      {/* ── Nav links ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

        {/* Browse — always visible */}
        <NavLink to="/browse" active={isActive('/browse')}>
          Browse
        </NavLink>

        {isAuthenticated && isCreator && (
          <>
            <NavLink to="/dashboard" active={isActive('/dashboard')}>
              Dashboard
            </NavLink>
          </>
        )}

        {isAuthenticated && !isCreator && (
          <NavLink to="/leaderboard" active={false}>
            Leaderboard
          </NavLink>
        )}
      </div>

      {/* ── Right side ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {isAuthenticated ? (
          <>
            {/* Create Quiz button — creators only */}
            {isCreator && (
              <button
                onClick={() => navigate('/quiz/create')}
                style={{
                  padding:      '6px 14px',
                  borderRadius: '8px',
                  background:   'linear-gradient(135deg,#7c3aed,#0891b2)',
                  color:        '#fff',
                  fontSize:     '13px',
                  fontWeight:   '500',
                  border:       'none',
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '5px',
                }}
              >
                + Create
              </button>
            )}

            {/* Username badge */}
            <div
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '6px',
                padding:      '5px 10px',
                borderRadius: '8px',
                background:   'rgba(255,255,255,0.05)',
                border:       '0.5px solid rgba(255,255,255,0.09)',
              }}
            >
              {/* Avatar circle */}
              <div
                style={{
                  width:           '22px',
                  height:          '22px',
                  borderRadius:    '50%',
                  background:      'linear-gradient(135deg,#7c3aed,#0891b2)',
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  fontSize:        '10px',
                  fontWeight:      '500',
                  color:           '#fff',
                  textTransform:   'uppercase',
                  flexShrink:      0,
                }}
              >
                {user?.username?.[0] || '?'}
              </div>
              <span style={{ fontSize: '13px', color: 'rgba(241,245,249,0.8)' }}>
                {user?.username}
              </span>
              <span
                style={{
                  fontSize:     '10px',
                  padding:      '1px 6px',
                  borderRadius: '4px',
                  background:   isCreator
                    ? 'rgba(124,58,237,0.2)'
                    : 'rgba(8,145,178,0.2)',
                  color: isCreator ? '#a78bfa' : '#22d3ee',
                }}
              >
                {user?.role}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              style={{
                padding:      '6px 12px',
                borderRadius: '8px',
                background:   'transparent',
                color:        'rgba(241,245,249,0.5)',
                fontSize:     '13px',
                border:       '0.5px solid rgba(255,255,255,0.09)',
                cursor:       'pointer',
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding:      '6px 14px',
                borderRadius: '8px',
                background:   'rgba(255,255,255,0.05)',
                color:        'rgba(241,245,249,0.8)',
                fontSize:     '13px',
                border:       '0.5px solid rgba(255,255,255,0.09)',
                cursor:       'pointer',
              }}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding:      '6px 14px',
                borderRadius: '8px',
                background:   'linear-gradient(135deg,#7c3aed,#0891b2)',
                color:        '#fff',
                fontSize:     '13px',
                fontWeight:   '500',
                border:       'none',
                cursor:       'pointer',
              }}
            >
              Register
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

/* ── Small NavLink sub-component ─────────────────────────────────── */
const NavLink = ({ to, active, children }) => (
  <Link
    to={to}
    style={{
      padding:        '5px 12px',
      borderRadius:   '7px',
      fontSize:       '13px',
      textDecoration: 'none',
      color:    active ? '#a78bfa' : 'rgba(241,245,249,0.55)',
      background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
      border:   active
        ? '0.5px solid rgba(124,58,237,0.3)'
        : '0.5px solid transparent',
      transition: 'all 0.15s ease',
    }}
  >
    {children}
  </Link>
)

export default Navbar