import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector }            from 'react-redux'
import toast                      from 'react-hot-toast'
import axiosInstance              from '../api/axiosInstance.js'
import { selectCurrentUser }      from '../features/auth/authSlice.js'

/* ── Format seconds → "Xm Ys" ────────────────────────────────── */
const fmtTime = (s) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

const rankStyles = {
  1: { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.3)',  color: '#fbbf24', icon: '🥇' },
  2: { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', color: '#94a3b8', icon: '🥈' },
  3: { bg: 'rgba(205,124,58,0.12)',  border: 'rgba(205,124,58,0.25)', color: '#cd7c3a', icon: '🥉' },
}

const LeaderboardPage = () => {
  const { quizId }    = useParams()
  const navigate      = useNavigate()
  const currentUser   = useSelector(selectCurrentUser)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/attempts/${quizId}/leaderboard`)
        setData(res.data)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load leaderboard')
        navigate(-1)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quizId, navigate])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid #fbbf24',
          animation: 'spin 0.7s linear infinite',
        }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const board = data?.leaderboard || []
  const myEntry = board.find((e) => e.userId === currentUser?._id || e.userId?.toString() === currentUser?.id?.toString())

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '44px', marginBottom: '10px' }}>🏆</div>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9', marginBottom: '5px' }}>
          Leaderboard
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(241,245,249,0.45)', marginBottom: '4px' }}>
          {data?.quizTitle}
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(241,245,249,0.3)' }}>
          {data?.totalEntries || 0} participants
        </p>
      </div>

      {/* ── Your rank card (if logged in and attempted) ────────── */}
      {myEntry && (
        <div style={{
          background:   'rgba(124,58,237,0.1)',
          border:       '0.5px solid rgba(124,58,237,0.3)',
          borderRadius: '12px',
          padding:      '1rem 1.25rem',
          marginBottom: '1.25rem',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          flexWrap:     'wrap',
          gap:          '10px',
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '3px', fontWeight: '500' }}>
              Your position
            </p>
            <p style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9' }}>
              #{myEntry.rank}
              <span style={{ fontSize: '13px', color: 'rgba(241,245,249,0.5)', marginLeft: '8px', fontWeight: '400' }}>
                out of {board.length}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: '500', color: '#a78bfa' }}>{myEntry.score}%</p>
              <p style={{ fontSize: '11px', color: 'rgba(241,245,249,0.4)' }}>Score</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: '500', color: '#22d3ee' }}>{fmtTime(myEntry.timeTaken)}</p>
              <p style={{ fontSize: '11px', color: 'rgba(241,245,249,0.4)' }}>Time</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {board.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '14px',
          border: '0.5px dashed rgba(255,255,255,0.08)',
        }}>
          <p style={{ fontSize: '32px', marginBottom: '10px' }}>🏁</p>
          <p style={{ fontSize: '15px', color: 'rgba(241,245,249,0.5)' }}>
            No one has taken this quiz yet
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.3)', marginTop: '5px' }}>
            Be the first on the leaderboard!
          </p>
        </div>
      )}

      {/* ── Leaderboard rows ───────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {board.map((entry) => {
          const isMe      = entry.userId === currentUser?.id || entry.userId?.toString() === currentUser?.id?.toString()
          const rankStyle = rankStyles[entry.rank]
          return (
            <div
              key={entry.userId}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '12px',
                padding:      '12px 14px',
                borderRadius: '11px',
                background:   isMe
                  ? 'rgba(124,58,237,0.08)'
                  : rankStyle?.bg || 'rgba(255,255,255,0.03)',
                border:       isMe
                  ? '0.5px solid rgba(124,58,237,0.3)'
                  : rankStyle
                    ? `0.5px solid ${rankStyle.border}`
                    : '0.5px solid rgba(255,255,255,0.06)',
                flexWrap: 'wrap',
              }}
            >
              {/* Rank */}
              <div style={{
                width:          '34px',
                height:         '34px',
                borderRadius:   '8px',
                flexShrink:     0,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       rankStyle ? '18px' : '13px',
                fontWeight:     '600',
                color:          rankStyle?.color || 'rgba(241,245,249,0.35)',
                background:     rankStyle ? 'transparent' : 'rgba(255,255,255,0.04)',
              }}>
                {rankStyle ? rankStyle.icon : `#${entry.rank}`}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: '100px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#f1f5f9' }}>
                    {entry.username}
                  </span>
                  {isMe && (
                    <span style={{
                      fontSize: '10px', padding: '1px 6px', borderRadius: '3px',
                      background: 'rgba(124,58,237,0.2)', color: '#a78bfa',
                    }}>you</span>
                  )}
                  {entry.penalised && (
                    <span style={{
                      fontSize: '10px', padding: '1px 6px', borderRadius: '3px',
                      background: 'rgba(239,68,68,0.15)', color: '#f87171',
                    }}>-10pts</span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(241,245,249,0.35)', marginTop: '2px' }}>
                  {entry.correctCount}/{entry.totalQuestions} correct
                </p>
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontSize:   '16px',
                  fontWeight: '500',
                  color:      rankStyle?.color || (isMe ? '#a78bfa' : 'rgba(241,245,249,0.7)'),
                }}>
                  {entry.score}%
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(241,245,249,0.35)', fontFamily: 'monospace' }}>
                  {fmtTime(entry.timeTaken)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Footer button ───────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={() => navigate('/browse')}
          style={{
            padding: '9px 22px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(241,245,249,0.7)', fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ← Back to Browse
        </button>
      </div>
    </div>
  )
}

export default LeaderboardPage