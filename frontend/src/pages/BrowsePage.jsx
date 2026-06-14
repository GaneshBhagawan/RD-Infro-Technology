import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { useDispatch }         from 'react-redux'
import toast                   from 'react-hot-toast'
import axiosInstance           from '../api/axiosInstance.js'
import { setBrowseQuizzes }    from '../features/quiz/quizSlice.js'

/* ── Format seconds → "X min" ─────────────────────────────────── */
const fmtTime = (s) => `${Math.floor(s / 60)} min`

const BrowsePage = () => {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const [quizzes,  setQuizzes]  = useState([])
  const [filtered, setFiltered] = useState([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)

  /* ── Fetch all published quizzes ───────────────────────────── */
  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axiosInstance.get('/quizzes')
        setQuizzes(data.quizzes)
        setFiltered(data.quizzes)
        dispatch(setBrowseQuizzes(data.quizzes))
      } catch {
        toast.error('Could not load quizzes')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [dispatch])

  /* ── Client-side search ────────────────────────────────────── */
  useEffect(() => {
    if (!search.trim()) { setFiltered(quizzes); return }
    const q = search.toLowerCase()
    setFiltered(quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(q) ||
        quiz.description?.toLowerCase().includes(q) ||
        quiz.creator?.username?.toLowerCase().includes(q)
    ))
  }, [search, quizzes])

  /* ── Tag colour cycling ────────────────────────────────────── */
  const tagColours = [
    { bg: 'rgba(124,58,237,0.2)',  color: '#a78bfa' },
    { bg: 'rgba(8,145,178,0.2)',   color: '#22d3ee' },
    { bg: 'rgba(5,150,105,0.2)',  color: '#34d399' },
    { bg: 'rgba(245,158,11,0.2)', color: '#fbbf24' },
    { bg: 'rgba(239,68,68,0.2)',  color: '#f87171' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid #a78bfa',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* ── Hero header ─────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p style={{
          fontSize: '12px', fontWeight: '500', color: '#a78bfa',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px',
        }}>
          {quizzes.length} quizzes available
        </p>
        <h1 style={{
          fontSize: '32px', fontWeight: '500', color: '#f1f5f9',
          marginBottom: '10px', lineHeight: 1.2,
        }}>
          Find your next{' '}
          <span style={{
            background: 'linear-gradient(90deg,#a78bfa,#22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>challenge</span>
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(241,245,249,0.45)', marginBottom: '1.5rem' }}>
          Take a quiz, beat the leaderboard, prove your knowledge
        </p>

        {/* Search bar */}
        <div style={{ position: 'relative', maxWidth: '480px', margin: '0 auto' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(241,245,249,0.3)', fontSize: '15px',
          }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes or creators…"
            style={{
              width:        '100%',
              background:   'rgba(255,255,255,0.05)',
              border:       '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding:      '11px 14px 11px 40px',
              fontSize:     '14px',
              color:        '#f1f5f9',
              outline:      'none',
              fontFamily:   'inherit',
            }}
          />
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</p>
          <p style={{ fontSize: '16px', color: 'rgba(241,245,249,0.6)', marginBottom: '6px' }}>
            {search ? 'No quizzes match your search' : 'No quizzes published yet'}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.3)' }}>
            {search ? 'Try a different keyword' : 'Be the first to create one!'}
          </p>
        </div>
      )}

      {/* ── Quiz grid ────────────────────────────────────────────── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap:                 '1rem',
      }}>
        {filtered.map((quiz, idx) => {
          const tag = tagColours[idx % tagColours.length]
          return (
            <div
              key={quiz._id}
              style={{
                background:   'rgba(255,255,255,0.04)',
                border:       '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding:      '1.25rem',
                display:      'flex',
                flexDirection: 'column',
                gap:          '10px',
                transition:   'border-color 0.2s ease, transform 0.2s ease',
                cursor:       'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'
                e.currentTarget.style.transform   = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.transform   = 'translateY(0)'
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: '500', padding: '3px 9px',
                  borderRadius: '20px', background: tag.bg, color: tag.color,
                }}>
                  {quiz.questions?.length || 0} questions
                </span>
                {quiz.aiGenerated && (
                  <span style={{
                    fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
                    background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                    border: '0.5px solid rgba(124,58,237,0.2)',
                  }}>✦ AI</span>
                )}
              </div>

              {/* Title + description */}
              <div>
                <h3 style={{
                  fontSize: '15px', fontWeight: '500', color: '#f1f5f9',
                  marginBottom: '5px', lineHeight: 1.3,
                }}>
                  {quiz.title}
                </h3>
                {quiz.description && (
                  <p style={{
                    fontSize: '13px', color: 'rgba(241,245,249,0.45)',
                    lineHeight: 1.5, overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {quiz.description}
                  </p>
                )}
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {[
                  { icon: '⏱', text: fmtTime(quiz.timeLimit) },
                  { icon: '👤', text: quiz.creator?.username || 'Unknown' },
                  { icon: '📊', text: `${quiz.totalAttempts || 0} attempts` },
                ].map((m) => (
                  <span key={m.text} style={{ fontSize: '12px', color: 'rgba(241,245,249,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {m.icon} {m.text}
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '7px', marginTop: '4px' }}>
                <button
                  onClick={() => navigate(`/quiz/${quiz._id}/take`)}
                  style={{
                    flex:         1,
                    padding:      '8px',
                    borderRadius: '9px',
                    background:   'linear-gradient(135deg,#7c3aed,#0891b2)',
                    color:        '#fff',
                    fontSize:     '13px',
                    fontWeight:   '500',
                    border:       'none',
                    cursor:       'pointer',
                  }}
                >
                  Take Quiz →
                </button>
                <button
                  onClick={() => navigate(`/leaderboard/${quiz._id}`)}
                  style={{
                    padding:      '8px 12px',
                    borderRadius: '9px',
                    background:   'rgba(255,255,255,0.05)',
                    color:        'rgba(241,245,249,0.6)',
                    fontSize:     '13px',
                    border:       '0.5px solid rgba(255,255,255,0.09)',
                    cursor:       'pointer',
                  }}
                >
                  🏆
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BrowsePage