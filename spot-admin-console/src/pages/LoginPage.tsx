import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { login } from '../services/ownerApi'
import { useAuthStore } from '../state/authStore'
import '../styles/owner.css'

export function LoginPage() {
  const { accessToken, user, login: setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (accessToken && user?.role === 'OWNER') {
    return <Navigate to="/owner" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const data = await login(email, password)
      if (data.user.role !== 'OWNER') {
        setError('This console is for Venue Owner accounts only.')
        return
      }
      setAuth(data.accessToken, data.user)
      navigate('/owner')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="owner-login">
      <h2>Venue Owner sign in</h2>
      <form onSubmit={handleSubmit}>
        <div className="owner-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="owner-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="owner-error-text">{error}</p>}
        <button className="owner-btn" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
