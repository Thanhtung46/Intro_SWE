import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { forgotPassword } from '../../services/authApi'
import { validateEmail } from '../../utils/authValidation'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    setError(null)
    setSubmitting(true)
    const result = await forgotPassword(email.trim())
    setSubmitting(false)

    if (!result.success) {
      setError(result.message || 'Could not send the reset code.')
      return
    }

    navigate('/forgot-password-otp', { state: { email: email.trim(), purpose: 'FORGOT_PASSWORD' } })
  }

  return (
    <AuthShell
      title=""
      cardVariant="glass"
      centered
      showLegalFooter={false}
    >
      <div className="auth-otp-icon">✉️</div>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
        Forgot Password?
      </h2>
      <p style={{ color: 'var(--auth-text-muted)', marginBottom: 32, maxWidth: 320 }}>
        Enter your registered email. We will send an OTP code for recovery.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            placeholder="username@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-btn" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send OTP Code'}
        </button>
      </form>

      <button className="auth-back-link" onClick={() => navigate('/login')}>
        ← Back to Login
      </button>
    </AuthShell>
  )
}
