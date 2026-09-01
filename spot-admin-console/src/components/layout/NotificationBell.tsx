import { useEffect, useRef, useState } from 'react'
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../services/notificationApi'
import iconBell from '../../assets/owner/icon-bell.svg'

const ICON_BY_TYPE: Record<string, string> = {
  OWNER_BOOKING_CREATED: '📅',
  OWNER_BOOKING_CANCELLED: '✖️',
  OWNER_BOOKING_REMINDER: '⏰',
}

function formatWhen(iso: string): string {
  const diffMin = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (diffMin < 60) return `${diffMin} min ago`
  const hours = Math.round(diffMin / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    getUnreadCount().then(setUnreadCount).catch(() => {})
    const interval = setInterval(() => {
      getUnreadCount().then(setUnreadCount).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next) {
      setLoading(true)
      listNotifications(20)
        .then(setItems)
        .finally(() => setLoading(false))
    }
  }

  async function handleItemClick(item: NotificationItem) {
    if (item.isRead) return
    setItems((prev) => prev.map((n) => (n.notificationId === item.notificationId ? { ...n, isRead: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await markNotificationRead(item.notificationId)
    } catch {
      // best-effort UI optimism; a stale read state self-corrects next open
    }
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      // ignore — next open refetches the real state
    }
  }

  return (
    <div className="owner-notif-wrap" ref={wrapRef}>
      <button className="owner-topbar__bell" aria-label="Notifications" onClick={toggleOpen}>
        <img src={iconBell} alt="" />
        {unreadCount > 0 && <span className="owner-topbar__bell-dot" />}
      </button>

      {open && (
        <div className="owner-notif-dropdown">
          <div className="owner-notif-dropdown__header">
            <span className="owner-notif-dropdown__title">Notifications</span>
            {unreadCount > 0 && (
              <button className="owner-notif-dropdown__mark-all" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>

          {loading && <div className="owner-notif-empty">Loading…</div>}

          {!loading && items.length === 0 && (
            <div className="owner-notif-empty">
              No notifications yet. You&rsquo;ll see new bookings, cancellations, and upcoming
              match reminders here.
            </div>
          )}

          {!loading &&
            items.map((item) => (
              <div
                key={item.notificationId}
                className={
                  item.isRead ? 'owner-notif-item' : 'owner-notif-item owner-notif-item--unread'
                }
                onClick={() => handleItemClick(item)}
              >
                <div className="owner-notif-item__icon">{ICON_BY_TYPE[item.type] ?? '🔔'}</div>
                <div>
                  <p className="owner-notif-item__title">{item.title}</p>
                  <p className="owner-notif-item__body">{item.body}</p>
                  <p className="owner-notif-item__time">{formatWhen(item.createdAt)}</p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
