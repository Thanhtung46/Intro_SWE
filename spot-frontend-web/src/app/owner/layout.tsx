'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Building2, LayoutDashboard, MessageSquare, Volleyball, Wallet } from 'lucide-react'
import { useAuthHydrated, useAuthStore } from '@/state/authStore'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/owner', icon: LayoutDashboard },
  { label: 'Facilities', href: '/owner/facilities', icon: Building2 },
  { label: 'Revenue', href: '/owner/revenue', icon: Wallet },
  { label: 'Reviews', href: '/owner/reviews', icon: MessageSquare },
]

function initials(name: string | undefined): string {
  const source = name?.trim() || 'Venue Owner'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const isHydrated = useAuthHydrated()
  const logout = useAuthStore((state) => state.logout)

  const isAuthorized = Boolean(accessToken) && user?.role === 'OWNER' && user?.status === 'ACTIVE'

  useEffect(() => {
    if (isHydrated && !isAuthorized) {
      router.replace('/auth/login')
    }
  }, [isHydrated, isAuthorized, router])

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-admin-muted">
        Loading...
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  return (
    <div className="flex min-h-screen bg-admin-bg">
      <aside className="flex w-64 flex-col border-r border-admin-border bg-white p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Volleyball size={22} className="text-admin-primary" />
          <div>
            <h2 className="text-lg font-bold text-admin-primary">Venue Owner</h2>
            <p className="text-xs font-medium text-admin-muted">{user?.fullName ?? 'Venue Owner'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/owner' ? pathname === '/owner' : pathname?.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-admin-infoBg text-admin-primary'
                    : 'text-admin-muted hover:bg-admin-surfaceMuted hover:text-admin-ink'
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 rounded-md px-3 py-2 text-left text-sm font-medium text-admin-danger hover:bg-admin-dangerBg"
        >
          Logout
        </button>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-5 border-b border-admin-border bg-white px-8 py-3">
          <button
            type="button"
            aria-label="Notifications"
            className="rounded-md p-2 text-admin-muted hover:bg-admin-surfaceMuted"
          >
            <Bell size={18} />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-admin-infoBg text-sm font-bold text-admin-primary">
              {initials(user?.fullName)}
            </span>
            <div>
              <p className="text-sm font-semibold text-admin-ink">{user?.fullName ?? 'Venue Owner'}</p>
              <p className="text-xs font-bold text-admin-muted">VENUE OWNER</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-auto p-8">{children}</main>
      </div>
    </div>
  )
}
