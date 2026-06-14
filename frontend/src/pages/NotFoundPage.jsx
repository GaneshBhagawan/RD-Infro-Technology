import { useNavigate } from 'react-router-dom'

const NotFoundPage = () => {
  const navigate = useNavigate()
  return (
    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
      <p style={{ fontSize: '64px', fontWeight: '500', color: 'rgba(241,245,249,0.1)', marginBottom: '8px' }}>
        404
      </p>
      <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9', marginBottom: '8px' }}>
        Page not found
      </h1>
      <p style={{ fontSize: '14px', color: 'rgba(241,245,249,0.4)', marginBottom: '1.5rem' }}>
        The page you're looking for doesn't exist.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '9px 20px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.07)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          color: 'rgba(241,245,249,0.7)', fontSize: '13px', cursor: 'pointer',
        }}
      >
        ← Back to Home
      </button>
    </div>
  )
}

export default NotFoundPage