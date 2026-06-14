import { useEffect, useRef } from 'react'

/**
 * TimerBar
 * Visual countdown timer displayed during a quiz.
 *
 * Props:
 *   totalSeconds   — original time limit (used to calculate % remaining)
 *   secondsLeft    — current seconds remaining (controlled by parent)
 *   onTick         — called every second with (secondsLeft - 1)
 *   onTimeUp       — called when timer hits 0
 */
const TimerBar = ({ totalSeconds, secondsLeft, onTick, onTimeUp }) => {
  const intervalRef = useRef(null)

  /* ── Start ticking ────────────────────────────────────────────── */
  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp?.()
      return
    }

    intervalRef.current = setInterval(() => {
      onTick((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          onTimeUp?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [])   // run once on mount — parent controls secondsLeft via onTick

  /* ── Format mm:ss ─────────────────────────────────────────────── */
  const format = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  /* ── Colour shifts: green → amber → red ──────────────────────── */
  const pct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0

  const barColour =
    pct > 50 ? '#10b981' :
    pct > 20 ? '#f59e0b' :
               '#ef4444'

  const textColour =
    pct > 50 ? '#34d399' :
    pct > 20 ? '#fbbf24' :
               '#f87171'

  const isUrgent = pct <= 20

  return (
    <div style={{ minWidth: '160px' }}>
      {/* ── Timer display ────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '6px',
          padding:        '6px 14px',
          borderRadius:   '20px',
          background:     `${textColour}18`,
          border:         `0.5px solid ${textColour}44`,
          marginBottom:   '6px',
          animation:      isUrgent ? 'pulse-timer 1s ease-in-out infinite' : 'none',
        }}
      >
        {/* Clock icon */}
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke={textColour} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>

        <span
          style={{
            fontFamily:  'var(--font-mono, monospace)',
            fontSize:    '15px',
            fontWeight:  '600',
            color:       textColour,
            letterSpacing: '0.05em',
          }}
        >
          {format(secondsLeft)}
        </span>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────── */}
      <div
        style={{
          height:       '3px',
          background:   'rgba(255,255,255,0.08)',
          borderRadius: '2px',
          overflow:     'hidden',
        }}
        role="progressbar"
        aria-valuenow={secondsLeft}
        aria-valuemin={0}
        aria-valuemax={totalSeconds}
        aria-label="Time remaining"
      >
        <div
          style={{
            height:     '100%',
            width:      `${pct}%`,
            background: barColour,
            borderRadius: '2px',
            transition: 'width 1s linear, background 0.5s ease',
          }}
        />
      </div>

      {/* Pulse animation injected once */}
      <style>{`
        @keyframes pulse-timer {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

export default TimerBar