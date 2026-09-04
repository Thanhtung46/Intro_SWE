import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { resetPassword } from '../../services/authApi'
import { validatePassword } from '../../utils/authValidation'

interface ResetPasswordLocationState {
  email?: string
  otp?: string
}

export function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as ResetPasswordLocationState | null) ?? {}
  const { email, otp } = state

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!email || !otp) {
    return <Navigate to="/forgot-password" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError(null)
    setSubmitting(true)
    const result = await resetPassword({ email: email!, otp: otp!, newPassword, confirmPassword })
    setSubmitting(false)

    if (!result.success) {
      setError(
        result.attemptsRemaining !== undefined
          ? `${result.message} (${result.attemptsRemaining} attempt(s) remaining)`
          : result.message || 'Could not reset the password.',
      )
      return
    }

    navigate('/login', { state: { passwordReset: true } })
  }

  return (
    <AuthShell title="" cardVariant="glass" centered showLegalFooter={false}>
      <div className="auth-otp-icon">🔒</div>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
        Create New Password
      </h2>
      <p style={{ color: 'var(--auth-text-muted)', marginBottom: 24, maxWidth: 320 }}>
        Your new password must be different from previously used passwords.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="newPassword">New Password</label>
          <div className="auth-input-wrap">
            <input
              id="newPassword"
              className="auth-input auth-input--with-toggle"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button type="button" className="auth-input-toggle" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            className="auth-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-btn" type="submit" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </AuthShell>
  )
}
