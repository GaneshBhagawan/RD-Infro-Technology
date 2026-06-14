import { useNavigate } from 'react-router-dom'

const UnauthorisedPage = () => {
  const navigate = useNavigate()
  return (
    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
      <p style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</p>
      <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9', marginBottom: '8px' }}>
        Access Denied
      </h1>
      <p style={{ fontSize: '14px', color: 'rgba(241,245,249,0.45)', marginBottom: '1.5rem' }}>
        You don't have permission to view this page.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '9px 20px', borderRadius: '10px',
          background: 'linear-gradient(135deg,#7c3aed,#0891b2)',
          color: '#fff', fontSize: '13px', border: 'none', cursor: 'pointer',
        }}
      >
        Go Home
      </button>
    </div>
  )
}

export default UnauthorisedPage