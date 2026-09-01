'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthHydrated, useAuthStore } from '@/state/authStore'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Pending Approvals', href: '/admin/approvals' },
  { label: 'User Management', href: '/admin/users' },
  { label: 'Settings', href: '/admin/settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const isHydrated = useAuthHydrated()
  const logout = useAuthStore((state) => state.logout)

  const isAuthorized = Boolean(accessToken) && user?.role === 'ADMIN'

  useEffect(() => {
    if (isHydrated && !isAuthorized) {
      router.replace('/auth/login')
    }
  }, [isHydrated, isAuthorized, router])

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-admin-muted">
        Đang tải...
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
        <div className="mb-6 px-2">
          <h2 className="text-lg font-bold text-admin-primary">SPOT ADMIN</h2>
          <p className="text-xs font-medium text-admin-muted">{user?.fullName ?? 'System Administrator'}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-admin-infoBg text-admin-primary'
                    : 'text-admin-muted hover:bg-admin-surfaceMuted hover:text-admin-ink'
                }`}
              >
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
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  )
}
