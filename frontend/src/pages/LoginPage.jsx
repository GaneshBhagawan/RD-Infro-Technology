import { useState }              from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch }           from 'react-redux'
import { useForm }               from 'react-hook-form'
import { zodResolver }           from '@hookform/resolvers/zod'
import { z }                     from 'zod'
import toast                     from 'react-hot-toast'
import axiosInstance             from '../api/axiosInstance.js'
import { setCredentials }        from '../features/auth/authSlice.js'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const S = {
  page: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '2rem 1rem',
  },
  card: {
    width:          '100%',
    maxWidth:       '420px',
    background:     'rgba(255,255,255,0.04)',
    border:         '0.5px solid rgba(255,255,255,0.09)',
    borderRadius:   '18px',
    padding:        '2.25rem 2rem',
    backdropFilter: 'blur(24px)',
  },
  label: {
    display:       'block',
    fontSize:      '12px',
    fontWeight:    '500',
    color:         'rgba(241,245,249,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom:  '6px',
  },
  input: {
    width:        '100%',
    background:   'rgba(255,255,255,0.05)',
    border:       '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: '9px',
    padding:      '10px 13px',
    fontSize:     '14px',
    color:        '#f1f5f9',
    outline:      'none',
    fontFamily:   'inherit',
    marginBottom: '4px',
  },
  inputErr: { border: '0.5px solid rgba(239,68,68,0.5)' },
  errText:  { fontSize: '12px', color: '#f87171', marginBottom: '10px' },
  btn: {
    width:        '100%',
    padding:      '11px',
    borderRadius: '10px',
    background:   'linear-gradient(135deg,#7c3aed,#0891b2)',
    color:        '#fff',
    fontSize:     '14px',
    fontWeight:   '500',
    border:       'none',
    cursor:       'pointer',
    marginTop:    '6px',
  },
}

const LoginPage = () => {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = location.state?.from || '/'
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await axiosInstance.post('/auth/login', data)
      dispatch(setCredentials({
        accessToken: res.data.accessToken,
        user:        res.data.user,
      }))
      toast.success(`Welcome back, ${res.data.user.username}!`)
      // Redirect based on role
      if (res.data.user.role === 'creator') navigate('/dashboard')
      else navigate('/browse')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg,#7c3aed,#0891b2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', color: '#fff', margin: '0 auto 14px',
          }}>Q</div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9', marginBottom: '5px' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.4)' }}>
            Sign in to your QuizMaker account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              style={{ ...S.input, ...(errors.email ? S.inputErr : {}) }}
            />
            {errors.email && <p style={S.errText}>{errors.email.message}</p>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={S.label}>Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              style={{ ...S.input, ...(errors.password ? S.inputErr : {}) }}
            />
            {errors.password && <p style={S.errText}>{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} style={{
            ...S.btn, opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          margin: '1.5rem 0',
        }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize: '12px', color: 'rgba(241,245,249,0.3)' }}>or</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(241,245,249,0.45)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: '500' }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage