import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import { OtpInput } from '../../components/auth/OtpInput'
import { resendOtp, verifyOtp } from '../../services/authApi'
import { validateOtp } from '../../utils/authValidation'

const RESEND_COOLDOWN_SECONDS = 60

function formatCountdown(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

interface OtpLocationState {
  email?: string
  purpose?: 'REGISTER' | 'FORGOT_PASSWORD'
}

export function OtpPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as OtpLocationState | null) ?? {}
  const email = state.email
  const purpose = state.purpose ?? 'REGISTER'
  const mode = purpose === 'FORGOT_PASSWORD' ? 'collect' : 'verify'

  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const verifiedRef = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  if (!email) {
    return <Navigate to={purpose === 'FORGOT_PASSWORD' ? '/forgot-password' : '/register'} replace />
  }

  async function handleVerify() {
    if (submitting || verifiedRef.current) return
    const otpError = validateOtp(otp)
    if (otpError) {
      setError(otpError)
      return
    }
    setError(null)

    if (mode === 'collect') {
      verifiedRef.current = true
      navigate('/reset-password', { state: { email, otp } })
      return
    }

    setSubmitting(true)
    const result = await verifyOtp(email!, otp, purpose)
    setSubmitting(false)

    if (!result.success) {
      setError(
        result.attemptsRemaining !== undefined
          ? `${result.message} (${result.attemptsRemaining} attempt(s) remaining)`
          : result.message || 'Invalid or expired OTP.',
      )
      return
    }

    verifiedRef.current = true
    navigate('/login', { state: { justVerified: true } })
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return
    setResending(true)
    setError(null)
    const result = await resendOtp(email!, purpose)
    setResending(false)

    if (!result.success) {
      setError(result.message || 'Could not resend the code.')
      return
    }
    setOtp('')
    setCooldown(result.resendAvailableInSeconds ?? RESEND_COOLDOWN_SECONDS)
  }

  return (
    <AuthShell title="" subtitle="" cardVariant="glass" centered showLegalFooter={false}>
      <div className="auth-otp-icon">🛡️</div>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
        OTP Verification
      </h2>
      <p style={{ color: 'var(--auth-text-faint)', marginBottom: 32 }}>
        Enter the 6-digit code sent to {email}.
      </p>

      <div className="auth-form">
        <OtpInput value={otp} onChange={setOtp} />

        <div className="auth-otp-timer">
          {cooldown > 0 ? (
            <>
              Resend code in <b>{formatCountdown(cooldown)}</b>
            </>
          ) : (
            <button className="auth-otp-resend" onClick={handleResend} disabled={resending}>
              {resending ? 'Resending…' : 'Resend code now'}
            </button>
          )}
        </div>

        {error && <p className="auth-error" style={{ textAlign: 'center' }}>{error}</p>}

        <button className="auth-btn" onClick={handleVerify} disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify'}
        </button>
      </div>
    </AuthShell>
  )
}
