import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate }                   from 'react-router-dom'
import { useSelector }                              from 'react-redux'
import toast                                        from 'react-hot-toast'
import axiosInstance                                from '../api/axiosInstance.js'
import { selectCurrentUser }                        from '../features/auth/authSlice.js'
import TimerBar                                     from '../components/quiz/TimerBar.jsx'

/* ── localStorage key helper ─────────────────────────────────────── */
const storageKey = (quizId) => `quiz_progress_${quizId}`

const S = {
  page: {
    maxWidth: '720px',
    margin:   '0 auto',
    padding:  '2rem 1.5rem 4rem',
  },
  glass: {
    background:   'rgba(255,255,255,0.04)',
    border:       '0.5px solid rgba(255,255,255,0.09)',
    borderRadius: '14px',
    padding:      '1.5rem',
  },
}

const QuizTakerPage = () => {
  const { id: quizId } = useParams()
  const navigate        = useNavigate()
  const user            = useSelector(selectCurrentUser)

  /* ── Core state ─────────────────────────────────────────────── */
  const [quiz,            setQuiz]           = useState(null)
  const [isLoading,       setIsLoading]      = useState(true)
  const [currentQIdx,     setCurrentQIdx]    = useState(0)
  const [answers,         setAnswers]        = useState({})   // { questionId: 'A'|'B'|'C'|'D' }
  const [secondsLeft,     setSecondsLeft]    = useState(0)
  const [isSubmitting,    setIsSubmitting]   = useState(false)
  const [submitted,       setSubmitted]      = useState(false)

  /* ── Anti-cheat state ───────────────────────────────────────── */
  const [tabSwitchCount,  setTabSwitchCount] = useState(0)
  const [showTabWarning,  setShowTabWarning] = useState(false)
  const tabSwitchRef = useRef(0)             // ref to read inside event listener

  /* ══════════════════════════════════════════════════════════════
     1. FETCH QUIZ
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data } = await axiosInstance.get(`/quizzes/${quizId}`)
        setQuiz(data.quiz)

        /* ── Restore saved progress from localStorage ─────────── */
        const saved = localStorage.getItem(storageKey(quizId))
        if (saved) {
          try {
            const { answers: savedAnswers, secondsLeft: savedTime, qIdx } = JSON.parse(saved)
            if (savedAnswers)  setAnswers(savedAnswers)
            if (savedTime > 0) setSecondsLeft(savedTime)
            else               setSecondsLeft(data.quiz.timeLimit)
            if (qIdx !== undefined) setCurrentQIdx(qIdx)
            toast('Progress restored from your last session', { icon: '💾' })
          } catch {
            setSecondsLeft(data.quiz.timeLimit)
          }
        } else {
          setSecondsLeft(data.quiz.timeLimit)
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load quiz')
        navigate('/browse')
      } finally {
        setIsLoading(false)
      }
    }
    fetchQuiz()
  }, [quizId, navigate])

  /* ══════════════════════════════════════════════════════════════
     2. AUTO-SAVE TO LOCALSTORAGE
     Saves every time answers, timer, or question index changes
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!quiz || submitted) return
    localStorage.setItem(
      storageKey(quizId),
      JSON.stringify({ answers, secondsLeft, qIdx: currentQIdx })
    )
  }, [answers, secondsLeft, currentQIdx, quiz, quizId, submitted])

  /* ══════════════════════════════════════════════════════════════
     3. VISIBILITY API — ANTI-CHEAT
     Detects tab switches / window blur during an active quiz
  ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!quiz || submitted) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        tabSwitchRef.current += 1
        setTabSwitchCount(tabSwitchRef.current)
        setShowTabWarning(true)

        /* ── Auto-submit on 3rd violation ─────────────────────── */
        if (tabSwitchRef.current >= 3) {
          toast.error('Too many tab switches — quiz auto-submitted with penalty', {
            duration: 4000,
          })
          handleSubmit(true)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    /* ── Cleanup on unmount or submit ─────────────────────────── */
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [quiz, submitted])   // eslint-disable-line react-hooks/exhaustive-deps

  /* ══════════════════════════════════════════════════════════════
     4. SUBMIT HANDLER
     Called by: submit button, timer expiry, 3rd tab switch
  ══════════════════════════════════════════════════════════════ */
  const handleSubmit = useCallback(
    async (penaltySubmit = false) => {
      if (isSubmitting || submitted || !quiz) return
      setIsSubmitting(true)
      setSubmitted(true)

      /* ── Clear saved progress ─────────────────────────────── */
      localStorage.removeItem(storageKey(quizId))

      /* ── Build answers array for the API ─────────────────── */
      const answersArray = quiz.questions.map((q) => ({
        questionId:     q._id,
        selectedOption: answers[q._id] || null,
      }))

      const timeTaken = quiz.timeLimit - secondsLeft

      try {
        const { data } = await axiosInstance.post('/attempts', {
          quizId,
          answers:        answersArray,
          timeTaken,
          timedOut:       penaltySubmit && secondsLeft === 0,
          tabSwitchCount: tabSwitchRef.current,
        })

        toast.success(`Submitted! Your score: ${data.score}%`)
        navigate(`/quiz/${quizId}/result/${data.attemptId}`)

      } catch (err) {
        /* ── Already attempted ────────────────────────────────── */
        if (err.response?.status === 409) {
          toast.error('You have already submitted this quiz')
          navigate('/browse')
          return
        }
        toast.error(err.response?.data?.message || 'Submission failed — try again')
        setIsSubmitting(false)
        setSubmitted(false)
      }
    },
    [quiz, quizId, answers, secondsLeft, isSubmitting, submitted, navigate]
  )

  /* ── Timer runs out → auto-submit ─────────────────────────── */
  const handleTimeUp = useCallback(() => {
    if (!submitted) {
      toast('Time is up! Submitting your answers…', { icon: '⏰', duration: 3000 })
      handleSubmit(true)
    }
  }, [submitted, handleSubmit])

  /* ══════════════════════════════════════════════════════════════
     5. ANSWER SELECTION
  ══════════════════════════════════════════════════════════════ */
  const selectAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  /* ══════════════════════════════════════════════════════════════
     LOADING STATE
  ══════════════════════════════════════════════════════════════ */
  if (isLoading) {
    return (
      <div style={{ ...S.page, display: 'flex', justifyContent: 'center', paddingTop: '6rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTop: '2px solid #a78bfa',
            animation: 'spin 0.7s linear infinite',
            margin: '0 auto 12px',
          }} />
          <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '14px' }}>Loading quiz…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (!quiz) return null

  const currentQ          = quiz.questions[currentQIdx]
  const totalQ            = quiz.questions.length
  const answeredCount     = Object.keys(answers).length
  const progressPct       = ((currentQIdx) / totalQ) * 100

  return (
    <div style={S.page}>

      {/* ══════════════════════════════════════════════════════════
          TOP BAR — title + timer
      ══════════════════════════════════════════════════════════ */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '1rem',
          gap:            '1rem',
          flexWrap:       'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '500', color: '#f1f5f9', marginBottom: '2px' }}>
            {quiz.title}
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(241,245,249,0.4)' }}>
            Taking as {user?.username}
          </p>
        </div>

        {secondsLeft > 0 && (
          <TimerBar
            totalSeconds={quiz.timeLimit}
            secondsLeft={secondsLeft}
            onTick={setSecondsLeft}
            onTimeUp={handleTimeUp}
          />
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB SWITCH WARNING BANNER
      ══════════════════════════════════════════════════════════ */}
      {showTabWarning && tabSwitchCount < 3 && (
        <div
          style={{
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            gap:          '10px',
            padding:      '10px 14px',
            borderRadius: '10px',
            background:   'rgba(245,158,11,0.1)',
            border:       '0.5px solid rgba(245,158,11,0.3)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <div>
              <p style={{ fontSize: '13px', color: '#fbbf24', fontWeight: '500' }}>
                Tab switch detected — Warning {tabSwitchCount} of 3
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(251,191,36,0.7)' }}>
                {3 - tabSwitchCount} more switch{3 - tabSwitchCount !== 1 ? 'es' : ''} will auto-submit your quiz with a 10-point penalty.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowTabWarning(false)}
            style={{
              background: 'transparent', border: 'none',
              color: '#fbbf24', cursor: 'pointer', fontSize: '16px', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PROGRESS BAR
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: '6px',
        }}>
          <span style={{ fontSize: '12px', color: 'rgba(241,245,249,0.45)' }}>
            Question {currentQIdx + 1} of {totalQ}
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(241,245,249,0.45)' }}>
            {answeredCount} answered
          </span>
        </div>
        <div style={{
          height: '4px', background: 'rgba(255,255,255,0.07)',
          borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            height:     '100%',
            width:      `${((currentQIdx + 1) / totalQ) * 100}%`,
            background: 'linear-gradient(90deg,#7c3aed,#22d3ee)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          QUESTION CARD
      ══════════════════════════════════════════════════════════ */}
      <div style={{ ...S.glass, marginBottom: '1rem' }}>
        <p
          style={{
            fontSize:    '15px',
            color:       '#f1f5f9',
            lineHeight:  '1.6',
            marginBottom: '1.25rem',
          }}
        >
          {currentQ.text}
        </p>

        {/* ── Answer options ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentQ.options.map((opt) => {
            const isSelected = answers[currentQ._id] === opt.label
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => selectAnswer(currentQ._id, opt.label)}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '12px',
                  padding:     '12px 14px',
                  borderRadius: '10px',
                  border:      isSelected
                    ? '0.5px solid rgba(124,58,237,0.55)'
                    : '0.5px solid rgba(255,255,255,0.08)',
                  background: isSelected
                    ? 'rgba(124,58,237,0.12)'
                    : 'rgba(255,255,255,0.03)',
                  cursor:    'pointer',
                  textAlign: 'left',
                  width:     '100%',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Label circle */}
                <div
                  style={{
                    width:          '28px',
                    height:         '28px',
                    borderRadius:   '50%',
                    flexShrink:     0,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       '12px',
                    fontWeight:     '600',
                    border:         isSelected
                      ? '0.5px solid rgba(124,58,237,0.6)'
                      : '0.5px solid rgba(255,255,255,0.15)',
                    background:  isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.04)',
                    color:       isSelected ? '#a78bfa' : 'rgba(241,245,249,0.55)',
                  }}
                >
                  {opt.label}
                </div>

                <span
                  style={{
                    fontSize: '14px',
                    color:    isSelected ? '#f1f5f9' : 'rgba(241,245,249,0.7)',
                  }}
                >
                  {opt.text}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          NAVIGATION BUTTONS
      ══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setCurrentQIdx((i) => Math.max(0, i - 1))}
          disabled={currentQIdx === 0}
          style={{
            padding:      '9px 18px',
            borderRadius: '9px',
            background:   'rgba(255,255,255,0.06)',
            border:       '0.5px solid rgba(255,255,255,0.1)',
            color:        currentQIdx === 0 ? 'rgba(241,245,249,0.25)' : 'rgba(241,245,249,0.7)',
            fontSize:     '13px',
            cursor:       currentQIdx === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          ← Previous
        </button>

        {/* Auto-save indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#34d399',
            animation: 'autosave-pulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '11px', color: 'rgba(52,211,153,0.7)' }}>
            Progress saved
          </span>
        </div>

        {currentQIdx < totalQ - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentQIdx((i) => Math.min(totalQ - 1, i + 1))}
            style={{
              padding:      '9px 18px',
              borderRadius: '9px',
              background:   'linear-gradient(135deg,#7c3aed,#0891b2)',
              color:        '#fff',
              fontSize:     '13px',
              fontWeight:   '500',
              border:       'none',
              cursor:       'pointer',
            }}
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            style={{
              padding:      '9px 18px',
              borderRadius: '9px',
              background:   isSubmitting ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg,#059669,#0891b2)',
              color:        '#fff',
              fontSize:     '13px',
              fontWeight:   '500',
              border:       'none',
              cursor:       isSubmitting ? 'not-allowed' : 'pointer',
              opacity:      isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Submitting…' : '✓ Submit Quiz'}
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          QUESTION NAVIGATOR — dot grid
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        marginTop:    '1.5rem',
        padding:      '1rem 1.25rem',
        background:   'rgba(255,255,255,0.03)',
        borderRadius: '10px',
        border:       '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ fontSize: '11px', color: 'rgba(241,245,249,0.35)', marginBottom: '8px' }}>
          Jump to question
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {quiz.questions.map((q, idx) => {
            const isAnswered = Boolean(answers[q._id])
            const isCurrent  = idx === currentQIdx
            return (
              <button
                key={q._id}
                type="button"
                onClick={() => setCurrentQIdx(idx)}
                style={{
                  width:        '32px',
                  height:       '32px',
                  borderRadius: '7px',
                  fontSize:     '12px',
                  fontWeight:   '500',
                  cursor:       'pointer',
                  border:       isCurrent
                    ? '0.5px solid rgba(124,58,237,0.6)'
                    : isAnswered
                      ? '0.5px solid rgba(16,185,129,0.4)'
                      : '0.5px solid rgba(255,255,255,0.1)',
                  background: isCurrent
                    ? 'rgba(124,58,237,0.25)'
                    : isAnswered
                      ? 'rgba(16,185,129,0.12)'
                      : 'rgba(255,255,255,0.04)',
                  color: isCurrent
                    ? '#a78bfa'
                    : isAnswered
                      ? '#34d399'
                      : 'rgba(241,245,249,0.45)',
                }}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          {[
            { color: '#a78bfa', label: 'Current' },
            { color: '#34d399', label: 'Answered' },
            { color: 'rgba(241,245,249,0.3)', label: 'Unanswered' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color }} />
              <span style={{ fontSize: '11px', color: 'rgba(241,245,249,0.35)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes autosave-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

export default QuizTakerPage