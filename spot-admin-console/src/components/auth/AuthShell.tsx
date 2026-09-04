import type { ReactNode } from 'react'
import logo from '../../assets/auth/logo.png'
import '../../styles/auth.css'

interface AuthShellProps {
  title: string
  subtitle?: string
  cardVariant?: 'plain' | 'glass'
  centered?: boolean
  children: ReactNode
  footer?: ReactNode
  showLegalFooter?: boolean
}

export function AuthShell({
  title,
  subtitle,
  cardVariant = 'glass',
  centered = false,
  children,
  footer,
  showLegalFooter = true,
}: AuthShellProps) {
  return (
    <div className="auth-page">
      <div className="auth-header">
        <img className="auth-header__logo" src={logo} alt="SPOT" />
        <h1 className="auth-header__title">{title}</h1>
        {subtitle && <p className="auth-header__subtitle">{subtitle}</p>}
      </div>

      <div
        className={
          cardVariant === 'glass'
            ? centered
              ? 'auth-card auth-card--glass auth-card--centered'
              : 'auth-card auth-card--glass'
            : centered
              ? 'auth-card auth-card--centered'
              : 'auth-card'
        }
      >
        {children}
      </div>

      {footer && <div className="auth-footer">{footer}</div>}

      {showLegalFooter && (
        <div className="auth-footer">
          <p className="auth-footer__legal">© 2026 SPOT Sports Booking. All rights reserved.</p>
          <div className="auth-footer__links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#help">Help Center</a>
          </div>
        </div>
      )}
    </div>
  )
}
