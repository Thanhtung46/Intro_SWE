import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../state/authStore'
import { useOwnerStore } from '../../state/ownerStore'
import logo from '../../assets/owner/logo.png'
import iconDashboard from '../../assets/owner/icon-nav-dashboard.svg'
import iconBookings from '../../assets/owner/icon-nav-bookings.svg'
import iconFacilities from '../../assets/owner/icon-nav-facilities.svg'
import iconRevenue from '../../assets/owner/icon-nav-revenue.svg'
import iconReviews from '../../assets/owner/icon-nav-reviews.svg'
import iconSettings from '../../assets/owner/icon-nav-settings.svg'
import iconSearch from '../../assets/owner/icon-search.svg'
import iconHelp from '../../assets/owner/icon-help.svg'
import iconLogout from '../../assets/owner/icon-logout.svg'
import { NotificationBell } from './NotificationBell'
import '../../styles/owner.css'

const NAV_LINKS = [
  { to: '/owner', label: 'Dashboard', end: true, icon: iconDashboard },
  { to: '/owner/schedule', label: 'Bookings', icon: iconBookings },
  { to: '/owner/facilities', label: 'Facilities', icon: iconFacilities },
  { to: '/owner/revenue', label: 'Revenue', icon: iconRevenue },
  { to: '/owner/reviews', label: 'Reviews', icon: iconReviews },
]

export function OwnerLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { venue, loading, error, loadVenue } = useOwnerStore()

  useEffect(() => {
    void loadVenue()
  }, [loadVenue])

  return (
    <div className="owner-shell">
      <aside className="owner-sidebar">
        <div className="owner-sidebar__brand">
          <img className="owner-sidebar__logo" src={logo} alt="SPOT" />
          <span className="owner-sidebar__brand-text">Venue Owner</span>
        </div>
        <nav className="owner-sidebar__nav">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? 'owner-sidebar__link owner-sidebar__link--active' : 'owner-sidebar__link'
              }
            >
              <span className="owner-sidebar__link-icon">
                <img src={link.icon} alt="" />
              </span>
              {link.label}
            </NavLink>
          ))}
          <NavLink
            to="/owner/settings"
            className={({ isActive }) =>
              isActive ? 'owner-sidebar__link owner-sidebar__link--active' : 'owner-sidebar__link'
            }
          >
            <span className="owner-sidebar__link-icon">
              <img src={iconSettings} alt="" />
            </span>
            Settings
          </NavLink>
        </nav>
        <div className="owner-sidebar__footer">
          <button className="owner-sidebar__footer-link">
            <span className="owner-sidebar__link-icon">
              <img src={iconHelp} alt="" />
            </span>
            Help Center
          </button>
          <button
            className="owner-sidebar__footer-link owner-sidebar__footer-link--danger"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <span className="owner-sidebar__link-icon">
              <img src={iconLogout} alt="" />
            </span>
            Logout
          </button>
        </div>
      </aside>
      <div className="owner-main">
        <header className="owner-topbar">
          <div className="owner-topbar__search-wrap">
            <img className="owner-topbar__search-icon" src={iconSearch} alt="" />
            <input className="owner-topbar__search" placeholder="Search bookings or venues..." />
          </div>
          <div className="owner-topbar__right">
            <NotificationBell />
            <button
              className="owner-topbar__user"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/owner/account')}
            >
              <div className="owner-topbar__user-text">
                <div className="owner-topbar__user-name">{user?.fullName ?? 'Owner'}</div>
                <div className="owner-topbar__user-role">Venue Owner</div>
              </div>
              {user?.avatarUrl ? (
                <img className="owner-topbar__avatar" src={user.avatarUrl} alt="" />
              ) : (
                <div className="owner-topbar__avatar" />
              )}
            </button>
          </div>
        </header>
        <main className="owner-content">
          {loading && !venue && <p>Loading your venue…</p>}
          {error && <p className="owner-error-text">{error}</p>}
          {!loading && !venue && !error && (
            <p style={{ color: 'var(--owner-text-muted)' }}>
              No venue found yet. Create one from the Facilities page.
            </p>
          )}
          {!loading && <Outlet />}
        </main>
      </div>
    </div>
  )
}
