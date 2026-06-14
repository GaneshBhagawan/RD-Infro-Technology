import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { useDispatch }         from 'react-redux'
import toast                   from 'react-hot-toast'
import axiosInstance           from '../api/axiosInstance.js'
import { setMyQuizzes, removeQuizFromMyList } from '../features/quiz/quizSlice.js'
import useAuth                 from '../hooks/useAuth.js'

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric',
})

const DashboardPage = () => {
  const { user }  = useAuth()
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const [quizzes,  setQuizzes]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(null)

  /* ── Fetch creator's quizzes ───────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axiosInstance.get('/quizzes/my/quizzes')
        setQuizzes(data.quizzes)
        dispatch(setMyQuizzes(data.quizzes))
      } catch {
        toast.error('Could not load your quizzes')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dispatch])

  /* ── Toggle publish ────────────────────────────────────────── */
  const handleTogglePublish = async (quiz) => {
    try {
      const { data } = await axiosInstance.patch(`/quizzes/${quiz._id}/publish`)
      setQuizzes((prev) =>
        prev.map((q) => q._id === quiz._id ? { ...q, status: data.status } : q)
      )
      toast.success(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  /* ── Soft delete ───────────────────────────────────────────── */
  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz? It will be soft-deleted and removed from the browse page.')) return
    setDeleting(quizId)
    try {
      await axiosInstance.delete(`/quizzes/${quizId}`)
      setQuizzes((prev) => prev.filter((q) => q._id !== quizId))
      dispatch(removeQuizFromMyList(quizId))
      toast.success('Quiz deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  /* ── Stats bar ─────────────────────────────────────────────── */
  const totalPublished = quizzes.filter((q) => q.status === 'published').length
  const totalDraft     = quizzes.filter((q) => q.status === 'draft').length
  const totalAttempts  = quizzes.reduce((s, q) => s + (q.totalAttempts || 0), 0)

  const stats = [
    { label: 'Total Quizzes',  value: quizzes.length,   colour: '#a78bfa' },
    { label: 'Published',      value: totalPublished,    colour: '#34d399' },
    { label: 'Drafts',         value: totalDraft,        colour: '#fbbf24' },
    { label: 'Total Attempts', value: totalAttempts,     colour: '#22d3ee' },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid #a78bfa',
          animation: 'spin 0.7s linear infinite',
        }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9', marginBottom: '4px' }}>
            Creator Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.4)' }}>
            Welcome back, {user?.username} 👋
          </p>
        </div>
        <button
          onClick={() => navigate('/quiz/create')}
          style={{
            padding:      '9px 18px',
            borderRadius: '10px',
            background:   'linear-gradient(135deg,#7c3aed,#0891b2)',
            color:        '#fff',
            fontSize:     '13px',
            fontWeight:   '500',
            border:       'none',
            cursor:       'pointer',
          }}
        >
          + Create Quiz
        </button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '1.75rem' }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background:   'rgba(255,255,255,0.04)',
            border:       '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding:      '1rem 1.25rem',
          }}>
            <p style={{ fontSize: '26px', fontWeight: '500', color: s.colour, marginBottom: '3px' }}>
              {s.value}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(241,245,249,0.4)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Empty state ────────────────────────────────────────── */}
      {quizzes.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'rgba(255,255,255,0.03)',
          border:     '0.5px dashed rgba(255,255,255,0.1)',
          borderRadius: '16px',
        }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📝</p>
          <p style={{ fontSize: '16px', color: 'rgba(241,245,249,0.6)', marginBottom: '6px' }}>
            No quizzes yet
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.3)', marginBottom: '1.25rem' }}>
            Create your first quiz manually or generate one with AI
          </p>
          <button
            onClick={() => navigate('/quiz/create')}
            style={{
              padding: '9px 20px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#7c3aed,#0891b2)',
              color: '#fff', fontSize: '13px', border: 'none', cursor: 'pointer',
            }}
          >
            + Create your first quiz
          </button>
        </div>
      )}

      {/* ── Quiz list ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {quizzes.map((quiz) => (
          <div
            key={quiz._id}
            style={{
              background:   'rgba(255,255,255,0.04)',
              border:       '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding:      '1.1rem 1.25rem',
              display:      'flex',
              alignItems:   'center',
              gap:          '14px',
              flexWrap:     'wrap',
            }}
          >
            {/* Status dot */}
            <div style={{
              width:        '8px',
              height:       '8px',
              borderRadius: '50%',
              flexShrink:   0,
              background:   quiz.status === 'published' ? '#34d399' : '#fbbf24',
              boxShadow:    quiz.status === 'published'
                ? '0 0 8px rgba(52,211,153,0.5)'
                : '0 0 8px rgba(251,191,36,0.5)',
            }}/>

            {/* Title + meta */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9' }}>
                  {quiz.title}
                </span>
                {quiz.aiGenerated && (
                  <span style={{
                    fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                    background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                  }}>✦ AI</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                {[
                  `${quiz.questions?.length || 0} questions`,
                  `${quiz.totalAttempts || 0} attempts`,
                  fmtDate(quiz.createdAt),
                ].map((t) => (
                  <span key={t} style={{ fontSize: '12px', color: 'rgba(241,245,249,0.38)' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Status badge */}
            <span style={{
              fontSize:     '11px',
              padding:      '3px 9px',
              borderRadius: '20px',
              fontWeight:   '500',
              background:   quiz.status === 'published'
                ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
              color:  quiz.status === 'published' ? '#34d399' : '#fbbf24',
              border: quiz.status === 'published'
                ? '0.5px solid rgba(52,211,153,0.25)' : '0.5px solid rgba(251,191,36,0.25)',
            }}>
              {quiz.status === 'published' ? 'Published' : 'Draft'}
            </span>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <ActionBtn
                onClick={() => navigate(`/quiz/${quiz._id}/edit`)}
                colour="rgba(255,255,255,0.07)"
                textColour="rgba(241,245,249,0.6)"
              >Edit</ActionBtn>

              <ActionBtn
                onClick={() => handleTogglePublish(quiz)}
                colour={quiz.status === 'published'
                  ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.12)'}
                textColour={quiz.status === 'published' ? '#fbbf24' : '#34d399'}
              >
                {quiz.status === 'published' ? 'Unpublish' : 'Publish'}
              </ActionBtn>

              <ActionBtn
                onClick={() => navigate(`/leaderboard/${quiz._id}`)}
                colour="rgba(8,145,178,0.12)"
                textColour="#22d3ee"
              >🏆</ActionBtn>

              <ActionBtn
                onClick={() => handleDelete(quiz._id)}
                colour="rgba(239,68,68,0.1)"
                textColour="#f87171"
                disabled={deleting === quiz._id}
              >
                {deleting === quiz._id ? '…' : 'Delete'}
              </ActionBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ActionBtn = ({ onClick, colour, textColour, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding:      '5px 11px',
      borderRadius: '7px',
      background:   colour,
      color:        textColour,
      fontSize:     '12px',
      border:       '0.5px solid rgba(255,255,255,0.07)',
      cursor:       disabled ? 'not-allowed' : 'pointer',
      opacity:      disabled ? 0.6 : 1,
      fontFamily:   'inherit',
      fontWeight:   '500',
    }}
  >
    {children}
  </button>
)

export default DashboardPage