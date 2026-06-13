/**
 * Spinner
 * Lightweight CSS spinner used while data is loading.
 * Props:
 *   size   — 'sm' | 'md' | 'lg'  (default: 'md')
 *   label  — screen-reader text   (default: 'Loading…')
 */
const sizeMap = {
  sm: '18px',
  md: '32px',
  lg: '48px',
}

const Spinner = ({ size = 'md', label = 'Loading…' }) => {
  const dim = sizeMap[size] || sizeMap.md

  return (
    <span
      role="status"
      aria-label={label}
      style={{
        display:      'inline-block',
        width:        dim,
        height:       dim,
        borderRadius: '50%',
        border:       '2px solid rgba(255,255,255,0.1)',
        borderTop:    '2px solid #a78bfa',
        animation:    'spin 0.7s linear infinite',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </span>
  )
}

export default Spinner