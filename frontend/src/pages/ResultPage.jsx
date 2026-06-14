import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast                      from 'react-hot-toast'
import axiosInstance              from '../api/axiosInstance.js'

const fmtTime = (s) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

const ResultPage = () => {
  const { quizId, attemptId } = useParams()
  const navigate = useNavigate()
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('breakdown') // 'breakdown' | 'all'

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axiosInstance.get(`/attempts/${attemptId}/result`)
        setResult(data)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load result')
        navigate('/browse')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [attemptId, navigate])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid #34d399',
          animation: 'spin 0.7s linear infinite',
        }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!result) return null

  const {
    quizTitle, score, correctCount, totalQuestions,
    timeTaken, timedOut, penalised, tabSwitchCount, rank, breakdown,
  } = result

  const passed = score >= 50
  const wrongAnswers = breakdown.filter((b) => !b.isCorrect)
  const shown = tab === 'breakdown' ? wrongAnswers : breakdown

  /* ── Score ring SVG ─────────────────────────────────────────── */
  const r         = 52
  const circ      = 2 * Math.PI * r
  const dash      = circ * (score / 100)
  const ringColour = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ fontSize: '36px', marginBottom: '8px' }}>
          {score >= 80 ? '🎉' : score >= 50 ? '👍' : '💪'}
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9', marginBottom: '4px' }}>
          {quizTitle}
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.4)' }}>
          Quiz complete — here's your full report
        </p>
      </div>

      {/* ── Main grid ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem', alignItems: 'start', marginBottom: '1.5rem' }}>

        {/* ── Left: Score card ─────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)',
          borderRadius: '14px', padding: '1.5rem', textAlign: 'center',
        }}>
          {/* Ring */}
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 12px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" role="img">
              <title>Score: {score}%</title>
              <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8"/>
              <circle
                cx="60" cy="60" r={r} fill="none"
                stroke={ringColour} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={circ * 0.25}
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '26px', fontWeight: '500', color: '#f1f5f9' }}>{score}%</span>
              <span style={{
                fontSize: '11px', fontWeight: '500',
                color: passed ? '#34d399' : '#f87171',
              }}>
                {passed ? 'Passed' : 'Failed'}
              </span>
            </div>
          </div>

          {/* Stats */}
          {[
            { label: 'Correct',   value: `${correctCount} / ${totalQuestions}`, colour: '#34d399' },
            { label: 'Wrong',     value: `${totalQuestions - correctCount} / ${totalQuestions}`, colour: '#f87171' },
            { label: 'Time',      value: fmtTime(timeTaken),  colour: '#22d3ee' },
            { label: 'Rank',      value: `#${rank}`,          colour: '#a78bfa' },
          ].map((s) => (
            <div key={s.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: '12px', color: 'rgba(241,245,249,0.4)' }}>{s.label}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: s.colour }}>{s.value}</span>
            </div>
          ))}

          {/* Flags */}
          {(timedOut || penalised || tabSwitchCount > 0) && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {timedOut && (
                <span style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '5px', background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                  ⏰ Timed out
                </span>
              )}
              {penalised && (
                <span style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '5px', background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                  ⚠ −10 tab penalty
                </span>
              )}
              {tabSwitchCount > 0 && (
                <span style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '5px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>
                  {tabSwitchCount} tab switch{tabSwitchCount > 1 ? 'es' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Answer breakdown ─────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#f1f5f9', marginBottom: '3px' }}>
                Answer Breakdown
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(241,245,249,0.4)' }}>
                {wrongAnswers.length === 0
                  ? 'Perfect score — all answers correct!'
                  : `${wrongAnswers.length} question${wrongAnswers.length > 1 ? 's' : ''} to review`}
              </p>
            </div>
            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' }}>
              {[
                { key: 'breakdown', label: 'Wrong only' },
                { key: 'all',       label: 'All answers' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: tab === t.key ? 'rgba(124,58,237,0.25)' : 'transparent',
                    color:      tab === t.key ? '#a78bfa' : 'rgba(241,245,249,0.45)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Perfect score empty state */}
          {tab === 'breakdown' && wrongAnswers.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '3rem',
              background: 'rgba(16,185,129,0.05)',
              border: '0.5px solid rgba(16,185,129,0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</p>
              <p style={{ fontSize: '15px', color: '#34d399' }}>Perfect score!</p>
              <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.4)', marginTop: '4px' }}>
                You answered every question correctly
              </p>
            </div>
          )}

          {/* Answer items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {shown.map((item, idx) => (
              <div
                key={item.questionId}
                style={{
                  background:   item.isCorrect ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                  border:       `0.5px solid ${item.isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                  borderRadius: '10px',
                  padding:      '12px 14px',
                }}
              >
                {/* Question header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', marginBottom: '8px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '500',
                    background: item.isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    color:      item.isCorrect ? '#34d399' : '#f87171',
                  }}>
                    {item.isCorrect ? '✓' : '✗'}
                  </div>
                  <p style={{ fontSize: '13px', color: '#f1f5f9', lineHeight: 1.5 }}>
                    {item.questionText}
                  </p>
                </div>

                {/* Answer tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: item.explanation ? '8px' : 0 }}>
                  {!item.isCorrect && item.selectedOption && (
                    <span style={{
                      fontSize: '12px', padding: '3px 10px', borderRadius: '5px',
                      background: 'rgba(239,68,68,0.15)', color: '#f87171',
                    }}>
                      Your answer: {item.selectedOption}
                    </span>
                  )}
                  {!item.isCorrect && !item.selectedOption && (
                    <span style={{
                      fontSize: '12px', padding: '3px 10px', borderRadius: '5px',
                      background: 'rgba(245,158,11,0.12)', color: '#fbbf24',
                    }}>
                      Not answered
                    </span>
                  )}
                  <span style={{
                    fontSize: '12px', padding: '3px 10px', borderRadius: '5px',
                    background: item.isCorrect ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.15)',
                    color:      item.isCorrect ? '#a78bfa' : '#34d399',
                  }}>
                    {item.isCorrect ? `Your answer: ${item.selectedOption}` : `Correct: ${item.correctAnswer}`}
                  </span>
                </div>

                {/* Explanation */}
                {item.explanation && (
                  <div style={{
                    borderLeft: '2px solid rgba(124,58,237,0.35)',
                    paddingLeft: '10px',
                    marginTop:  '6px',
                  }}>
                    <p style={{ fontSize: '12px', color: 'rgba(241,245,249,0.5)', lineHeight: 1.6 }}>
                      💡 {item.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer actions ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(`/leaderboard/${quizId}`)}
          style={{
            padding: '9px 20px', borderRadius: '10px',
            background: 'linear-gradient(135deg,#7c3aed,#0891b2)',
            color: '#fff', fontSize: '13px', fontWeight: '500',
            border: 'none', cursor: 'pointer',
          }}
        >
          🏆 View Leaderboard
        </button>
        <button
          onClick={() => navigate('/browse')}
          style={{
            padding: '9px 20px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(241,245,249,0.7)', fontSize: '13px', cursor: 'pointer',
          }}
        >
          Browse more quizzes
        </button>
      </div>
    </div>
  )
}

export default ResultPage