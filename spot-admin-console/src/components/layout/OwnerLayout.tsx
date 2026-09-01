import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../state/authStore'
import { useOwnerStore } from '../../state/ownerStore'
import '../../styles/owner.css'

const NAV_LINKS = [
  { to: '/owner', label: 'Dashboard', end: true },
  { to: '/owner/schedule', label: 'Schedule' },
  { to: '/owner/facilities', label: 'Facilities' },
  { to: '/owner/revenue', label: 'Revenue' },
  { to: '/owner/reviews', label: 'Reviews' },
]

export function OwnerLayout() {
  const user = useAuthStore((s) => s.user)
  const { venue, loading, error, loadVenue } = useOwnerStore()

  useEffect(() => {
    void loadVenue()
  }, [loadVenue])

  return (
    <div className="owner-shell">
      <aside className="owner-sidebar">
        <div className="owner-sidebar__brand">SPOT — Venue Owner</div>
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
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="owner-main">
        <header className="owner-topbar">
          <input className="owner-topbar__search" placeholder="Search bookings or venues..." />
          <span className="owner-topbar__user">{user?.fullName ?? 'Owner'}</span>
        </header>
        <main className="owner-content">
          {loading && !venue && <p>Loading your venue…</p>}
          {error && <p className="owner-error-text">{error}</p>}
          {!loading && !venue && !error && (
            <p>No venue found yet. Create one from the Facilities page.</p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
