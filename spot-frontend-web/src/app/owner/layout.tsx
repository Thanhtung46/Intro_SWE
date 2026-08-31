'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Building2, LayoutDashboard, MessageSquare, Volleyball, Wallet } from 'lucide-react'
import { useAuthHydrated, useAuthStore } from '@/state/authStore'
import * as ownerService from '@/services/owner.service'
import type { OwnerNotification } from '@/types/owner'

const UNREAD_POLL_INTERVAL_MS = 30_000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function relativeDate(iso: string): string {
  const date = new Date(iso)
  const diffDays = Math.round((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<OwnerNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const poll = () => {
      ownerService
        .getUnreadNotificationCount()
        .then((res) => setUnreadCount(res.count))
        .catch(() => {
          // Non-fatal — the dot just stays as-is if this fails.
        })
    }
    poll()
    const interval = setInterval(poll, UNREAD_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    const next = !isOpen
    setIsOpen(next)
    if (next) {
      setIsLoading(true)
      ownerService
        .listNotifications({ limit: 10 })
        .then((res) => setItems(res.items))
        .catch(() => {
          // Non-fatal — dropdown just shows nothing new if this fails.
        })
        .finally(() => setIsLoading(false))
    }
  }

  const handleMarkRead = (notification: OwnerNotification) => {
    if (notification.isRead) return
    setItems((prev) => prev.map((n) => (n.notificationId === notification.notificationId ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    ownerService.markNotificationRead(notification.notificationId).catch(() => {
      // Non-fatal — local state already updated optimistically.
    })
  }

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    ownerService.markAllNotificationsRead().catch(() => {
      // Non-fatal — local state already updated optimistically.
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={handleToggle}
        className="relative rounded-md p-2 text-admin-muted hover:bg-admin-surfaceMuted"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-admin-danger" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-admin-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
            <p className="text-sm font-semibold text-admin-ink">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-admin-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-admin-muted">Loading...</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-admin-muted">No notifications yet</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.notificationId} className="border-b border-admin-border last:border-0">
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n)}
                      className={`block w-full px-4 py-3 text-left hover:bg-admin-surfaceMuted ${
                        n.isRead ? 'bg-white' : 'bg-admin-infoBg'
                      }`}
                    >
                      <p className="text-sm font-semibold text-admin-ink">{n.title}</p>
                      <p className="line-clamp-2 text-xs text-admin-muted">{n.body}</p>
                      <p className="mt-1 text-xs text-admin-subtle">{relativeDate(n.createdAt)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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
          <NotificationBell />
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
