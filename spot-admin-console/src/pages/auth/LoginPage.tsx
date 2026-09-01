import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { login } from '../../services/authApi'
import { useAuthStore } from '../../state/authStore'
import { validateEmail } from '../../utils/authValidation'

export function LoginPage() {
  const { accessToken, user, login: setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (accessToken && user?.role === 'OWNER') {
    return <Navigate to="/owner" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)

    if (!result.success || !result.accessToken || !result.user) {
      setError(result.message || 'Invalid email or password.')
      return
    }

    if (result.user.role !== 'OWNER') {
      setError('This console is for Venue Owner accounts only.')
      return
    }

    setAuth(result.accessToken, result.user)
    navigate('/owner')
  }

  return (
    <AuthShell title="Login" subtitle="Login to manage your venue">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <div className="auth-field__label-row">
            <label htmlFor="email">
              Email <span className="auth-field__required">*</span>
            </label>
          </div>
          <div className="auth-input-wrap">
            <input
              id="email"
              className="auth-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label htmlFor="password">
              Password <span className="auth-field__required">*</span>
            </label>
            <button
              type="button"
              className="auth-field__link"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </button>
          </div>
          <div className="auth-input-wrap">
            <input
              id="password"
              className="auth-input auth-input--with-toggle"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-btn" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <div className="auth-footer__row" style={{ marginTop: 32, textAlign: 'center' }}>
        Don&rsquo;t have an account? <button onClick={() => navigate('/register')}>Register</button>
      </div>
    </AuthShell>
  )
}
