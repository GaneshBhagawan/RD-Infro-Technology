import { useNavigate } from 'react-router-dom'
import useAuth         from '../hooks/useAuth.js'

const features = [
  { icon: '✦', title: 'AI-Powered Generation', desc: 'Turn a single prompt into a full quiz with questions, options, and explanations in seconds.' },
  { icon: '⏱', title: 'Live Timer & Auto-Submit', desc: 'Every quiz runs on a countdown. Time runs out — answers are submitted automatically.' },
  { icon: '🏆', title: 'Global Leaderboards', desc: 'Ranked by score then speed. Ties broken by fastest completion time.' },
  { icon: '🛡', title: 'Anti-Cheat Detection', desc: 'Tab-switch detection with automatic warnings and penalties.' },
  { icon: '💾', title: 'Auto-Save Progress', desc: 'Refresh mid-quiz — your answers and timer are restored from local storage.' },
  { icon: '📊', title: 'Creator Analytics', desc: 'See attempt counts, average scores, and per-question accuracy for your quizzes.' },
]

const HomePage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isCreator } = useAuth()

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{
          display: 'inline-block', fontSize: '11px', fontWeight: '500',
          color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em',
          padding: '4px 14px', borderRadius: '20px',
          background: 'rgba(124,58,237,0.15)', border: '0.5px solid rgba(124,58,237,0.25)',
          marginBottom: '1.25rem',
        }}>
          AI-Powered · Competitive · Free
        </div>

        <h1 style={{
          fontSize: '44px', fontWeight: '500', lineHeight: 1.15,
          color: '#f1f5f9', marginBottom: '1rem',
        }}>
          Build quizzes.<br/>
          <span style={{
            background: 'linear-gradient(90deg,#a78bfa,#22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Challenge everyone.
          </span>
        </h1>

        <p style={{
          fontSize: '16px', color: 'rgba(241,245,249,0.5)',
          maxWidth: '520px', margin: '0 auto 2rem', lineHeight: 1.7,
        }}>
          Create custom quizzes in seconds using AI. Take them with a live timer.
          Compete on global leaderboards. All free, forever.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <>
              <button
                onClick={() => navigate(isCreator ? '/quiz/create' : '/browse')}
                style={{
                  padding: '12px 26px', borderRadius: '11px',
                  background: 'linear-gradient(135deg,#7c3aed,#0891b2)',
                  color: '#fff', fontSize: '14px', fontWeight: '500',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {isCreator ? '+ Create a Quiz' : 'Browse Quizzes →'}
              </button>
              {isCreator && (
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    padding: '12px 26px', borderRadius: '11px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    color: 'rgba(241,245,249,0.75)', fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  My Dashboard
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/register')}
                style={{
                  padding: '12px 26px', borderRadius: '11px',
                  background: 'linear-gradient(135deg,#7c3aed,#0891b2)',
                  color: '#fff', fontSize: '14px', fontWeight: '500',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Get started free →
              </button>
              <button
                onClick={() => navigate('/browse')}
                style={{
                  padding: '12px 26px', borderRadius: '11px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: 'rgba(241,245,249,0.75)', fontSize: '14px', cursor: 'pointer',
                }}
              >
                Browse quizzes
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Features grid ────────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{
          textAlign: 'center', fontSize: '12px', fontWeight: '500',
          color: 'rgba(241,245,249,0.35)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '1.5rem',
        }}>
          Everything you need
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '10px',
        }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '1.25rem',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '9px',
                background: 'rgba(124,58,237,0.15)',
                border: '0.5px solid rgba(124,58,237,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', marginBottom: '10px',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9', marginBottom: '5px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.4)', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HomePage