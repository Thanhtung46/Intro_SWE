import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { selectRole } from '../../services/authApi'
import type { Role } from '../../types/auth'

const ROLES: { role: Role; title: string; desc: string; icon: string }[] = [
  { role: 'player', title: 'Player', desc: 'Find venues, connect with teams, and book matches easily.', icon: '🏃' },
  { role: 'owner', title: 'Venue Owner', desc: 'Manage bookings, revenue, and optimize facility operations.', icon: '🏟️' },
  { role: 'referee', title: 'Referee', desc: 'Receive match assignments and support the sports community.', icon: '🧑‍⚖️' },
]

export function ChooseRolePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email
  const [selected, setSelected] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!email) {
    return <Navigate to="/register" replace />
  }

  async function handleContinue() {
    if (!selected || submitting) return
    setError(null)
    setSubmitting(true)
    const result = await selectRole(email!, selected)
    setSubmitting(false)

    if (!result.success) {
      setError(result.message || 'Could not set your role.')
      return
    }

    navigate('/otp', { state: { email, purpose: 'REGISTER' } })
  }

  return (
    <AuthShell title="Who are you?" subtitle="Choose your role on the SPOT system." cardVariant="plain">
      <div className="auth-role-grid">
        {ROLES.map((r) => (
          <div
            key={r.role}
            className={
              selected === r.role ? 'auth-role-card auth-role-card--selected' : 'auth-role-card'
            }
            onClick={() => setSelected(r.role)}
          >
            {selected === r.role && <span className="auth-role-card__check">✓</span>}
            <div className="auth-role-card__icon">{r.icon}</div>
            <p className="auth-role-card__title">{r.title}</p>
            <p className="auth-role-card__desc">{r.desc}</p>
          </div>
        ))}
      </div>

      {error && <p className="auth-error" style={{ marginTop: 16 }}>{error}</p>}

      <button
        className="auth-btn"
        style={{ marginTop: 16 }}
        disabled={!selected || submitting}
        onClick={handleContinue}
      >
        {submitting ? 'Saving…' : 'Complete'}
      </button>
    </AuthShell>
  )
}
