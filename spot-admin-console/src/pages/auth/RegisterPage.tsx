import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { register } from '../../services/authApi'
import { validateEmail, validatePassword } from '../../utils/authValidation'

export function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) return setError('Name is required')
    const emailError = validateEmail(email)
    if (emailError) return setError(emailError)
    const passwordError = validatePassword(password)
    if (passwordError) return setError(passwordError)
    if (password !== confirmPassword) return setError('Passwords do not match')

    setSubmitting(true)
    const result = await register({
      fullName: fullName.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      gender: gender || undefined,
      password,
      confirmPassword,
    })
    setSubmitting(false)

    if (!result.success) {
      setError(result.message || 'Could not create the account.')
      return
    }

    navigate('/choose-role', { state: { email: email.trim() } })
  }

  return (
    <AuthShell title="Register" subtitle="Enter basic information" cardVariant="plain">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="fullName">
            Name <span className="auth-field__required">*</span>
          </label>
          <input
            id="fullName"
            className="auth-input"
            placeholder="Enter full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="email">
            Email <span className="auth-field__required">*</span>
          </label>
          <input
            id="email"
            className="auth-input"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-row">
          <div className="auth-field">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              className="auth-input"
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              className="auth-select"
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password">
            Password <span className="auth-field__required">*</span>
          </label>
          <div className="auth-input-wrap">
            <input
              id="password"
              className="auth-input auth-input--with-toggle"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="auth-input-toggle" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="confirmPassword">
            Confirm password <span className="auth-field__required">*</span>
          </label>
          <input
            id="confirmPassword"
            className="auth-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-btn" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>

        <div className="auth-footer__row" style={{ textAlign: 'center', borderTop: '1px solid rgba(195,198,215,0.3)', paddingTop: 24 }}>
          Already have an account? <button type="button" onClick={() => navigate('/login')}>Login</button>
        </div>
      </form>
    </AuthShell>
  )
}
