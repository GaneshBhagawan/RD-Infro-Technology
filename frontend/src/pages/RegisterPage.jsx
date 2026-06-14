import { useState }         from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm }          from 'react-hook-form'
import { zodResolver }      from '@hookform/resolvers/zod'
import { z }                from 'zod'
import toast                from 'react-hot-toast'
import axiosInstance        from '../api/axiosInstance.js'

const schema = z.object({
  username: z.string()
    .min(3,  'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  email:    z.string().email('Enter a valid email'),
  password: z.string()
    .min(6,  'Password must be at least 6 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role:     z.enum(['creator', 'taker']),
})

const S = {
  page: {
    minHeight:      'calc(100vh - 60px)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '2rem 1rem',
  },
  card: {
    width:          '100%',
    maxWidth:       '460px',
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
  },
  inputErr: { border: '0.5px solid rgba(239,68,68,0.5)' },
  errText:  { fontSize: '12px', color: '#f87171', marginTop: '4px', marginBottom: '6px' },
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
    marginTop:    '8px',
  },
}

const RegisterPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState('taker')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: { role: 'taker' },
  })

  const selectRole = (role) => {
    setSelectedRole(role)
    setValue('role', role)
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await axiosInstance.post('/auth/register', data)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    {
      value: 'taker',
      icon:  '🎯',
      label: 'Quiz Taker',
      desc:  'Browse and take quizzes, compete on leaderboards',
      colour: '#0891b2',
    },
    {
      value: 'creator',
      icon:  '✏️',
      label: 'Quiz Creator',
      desc:  'Build quizzes manually or with AI, view analytics',
      colour: '#7c3aed',
    },
  ]

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg,#7c3aed,#0891b2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', color: '#fff', margin: '0 auto 14px',
          }}>Q</div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9', marginBottom: '5px' }}>
            Create your account
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.4)' }}>
            Join QuizMaker — free forever
          </p>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={S.label}>I want to</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {roles.map((r) => {
              const active = selectedRole === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => selectRole(r.value)}
                  style={{
                    padding:      '12px 10px',
                    borderRadius: '10px',
                    border:       active
                      ? `0.5px solid ${r.colour}66`
                      : '0.5px solid rgba(255,255,255,0.08)',
                    background: active
                      ? `${r.colour}18`
                      : 'rgba(255,255,255,0.03)',
                    cursor:    'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '5px' }}>{r.icon}</div>
                  <div style={{
                    fontSize: '13px', fontWeight: '500',
                    color: active ? '#f1f5f9' : 'rgba(241,245,249,0.6)',
                    marginBottom: '3px',
                  }}>{r.label}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(241,245,249,0.35)', lineHeight: 1.4 }}>
                    {r.desc}
                  </div>
                </button>
              )
            })}
          </div>
          {/* Hidden input keeps role in form state */}
          <input type="hidden" {...register('role')} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>Username</label>
            <input
              {...register('username')}
              placeholder="quizmaster99"
              style={{ ...S.input, ...(errors.username ? S.inputErr : {}) }}
            />
            {errors.username && <p style={S.errText}>{errors.username.message}</p>}
          </div>

          <div style={{ marginBottom: '12px' }}>
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
              placeholder="Min 6 chars, 1 uppercase, 1 number"
              style={{ ...S.input, ...(errors.password ? S.inputErr : {}) }}
            />
            {errors.password && <p style={S.errText}>{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={loading} style={{
            ...S.btn,
            opacity: loading ? 0.7 : 1,
            cursor:  loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(241,245,249,0.45)', marginTop: '1.25rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: '500' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage