'use client'

import { useCallback, useEffect, useState } from 'react'
import * as adminService from '@/services/admin.service'
import type { AdminRole, AdminUserRow, AssignableRole, UserStatus } from '@/types/admin'
import Badge, { roleBadgeVariant, statusBadgeVariant } from '@/components/admin/Badge'
import Modal from '@/components/admin/Modal'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import Toast from '@/components/admin/Toast'
import Pagination from '@/components/admin/Pagination'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatDate } from '@/utils/formatRelativeTime'

const LIMIT = 20
const ROLE_FILTER_OPTIONS: { value: AdminRole | ''; label: string }[] = [
  { value: '', label: 'Tất cả vai trò' },
  { value: 'PLAYER', label: 'Player' },
  { value: 'OWNER', label: 'Venue Owner' },
  { value: 'REFEREE', label: 'Referee' },
  { value: 'ADMIN', label: 'Admin' },
]
const STATUS_FILTER_OPTIONS: { value: UserStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'LOCKED', label: 'Locked' },
]
const ASSIGNABLE_ROLES: AssignableRole[] = ['PLAYER', 'OWNER', 'REFEREE']
const STATUS_VALUES: UserStatus[] = ['ACTIVE', 'PENDING', 'LOCKED']

function initials(row: AdminUserRow): string {
  const source = row.fullName ?? row.email
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function UserManagementPage() {
  const [role, setRole] = useState<AdminRole | ''>('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [items, setItems] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null)

  const { toast, showToast, closeToast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim())
      setOffset(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchList = useCallback(() => {
    setIsLoading(true)
    setError(null)
    adminService
      .listUsers({ role: role || undefined, status: status || undefined, q: q || undefined, limit: LIMIT, offset })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Không tải được danh sách người dùng.')))
      .finally(() => setIsLoading(false))
  }, [role, status, q, offset])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-admin-ink">User Management</h1>
      <p className="mb-6 text-sm text-admin-muted">Quản lý vai trò và trạng thái người dùng</p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm theo tên, email hoặc ID..."
          className="min-w-[240px] flex-1 rounded-md border border-admin-border bg-admin-surfaceMuted px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as AdminRole | '')
            setOffset(0)
          }}
          className="rounded-md border border-admin-border px-3 py-2 text-sm text-admin-ink"
        >
          {ROLE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as UserStatus | '')
            setOffset(0)
          }}
          className="rounded-md border border-admin-border px-3 py-2 text-sm text-admin-ink"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-admin-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-admin-surfaceMuted text-xs font-bold uppercase text-admin-subtle">
              <tr>
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tham gia</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-admin-muted">
                    Đang tải...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-admin-muted">
                    Không có người dùng nào.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.userId} className="border-t border-admin-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-admin-infoBg text-sm font-bold text-admin-primary">
                          {initials(row)}
                        </span>
                        <div>
                          <p className="font-semibold text-admin-ink">{row.fullName ?? '(chưa đặt tên)'}</p>
                          <p className="text-admin-muted">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadgeVariant(row.role)}>{row.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-admin-muted">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditingUser(row)}
                        className="font-semibold text-admin-primary hover:underline"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={total} limit={LIMIT} offset={offset} itemLabel="người dùng" onOffsetChange={setOffset} />
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onDone={(type, message) => {
            setEditingUser(null)
            showToast(type, message)
            fetchList()
          }}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

function EditUserModal({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserRow
  onClose: () => void
  onDone: (type: 'success' | 'error', message: string) => void
}) {
  const isAdmin = user.role === 'ADMIN'
  const [role, setRole] = useState<AssignableRole>(isAdmin ? 'PLAYER' : (user.role as AssignableRole))
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingLock, setPendingLock] = useState(false)

  const hasChanges = (!isAdmin && role !== user.role) || status !== user.status

  const submit = () => {
    setIsSubmitting(true)
    const payload: { role?: AssignableRole; status?: UserStatus } = {}
    if (!isAdmin && role !== user.role) payload.role = role
    if (status !== user.status) payload.status = status

    adminService
      .updateUser(user.userId, payload)
      .then(() => onDone('success', 'Đã cập nhật người dùng.'))
      .catch((err) => onDone('error', getApiErrorMessage(err, 'Cập nhật thất bại.')))
      .finally(() => setIsSubmitting(false))
  }

  const handleSubmit = () => {
    if (status === 'LOCKED' && user.status !== 'LOCKED') {
      setPendingLock(true)
      return
    }
    submit()
  }

  return (
    <Modal title={user.fullName ?? user.email} onClose={onClose}>
      <div className="space-y-4">
        {isAdmin && (
          <p className="rounded-md bg-admin-infoBg px-3 py-2 text-sm text-admin-info">
            Tài khoản ADMIN — không thể đổi vai trò qua giao diện này.
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-admin-muted">VAI TRÒ</label>
          <select
            value={role}
            disabled={isAdmin}
            onChange={(e) => setRole(e.target.value as AssignableRole)}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm disabled:bg-admin-surfaceMuted"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-admin-muted">TRẠNG THÁI</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
          >
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 border-t border-admin-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-admin-border px-4 py-2 text-sm font-medium text-admin-ink"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChanges}
            className="rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-60"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {pendingLock && (
        <ConfirmDialog
          title="Khoá tài khoản?"
          message={`Bạn sắp khoá tài khoản của ${user.fullName ?? user.email}. Người này sẽ không thể đăng nhập cho đến khi được mở khoá lại.`}
          confirmLabel="Khoá tài khoản"
          danger
          isSubmitting={isSubmitting}
          onCancel={() => setPendingLock(false)}
          onConfirm={() => {
            setPendingLock(false)
            submit()
          }}
        />
      )}
    </Modal>
  )
}
