'use client'

import { useCallback, useEffect, useState } from 'react'
import * as adminService from '@/services/admin.service'
import type { VerificationRequestRow, VerificationRole, VerificationStatus } from '@/types/admin'
import Badge, { statusBadgeVariant } from '@/components/admin/Badge'
import Modal from '@/components/admin/Modal'
import Toast from '@/components/admin/Toast'
import Pagination from '@/components/admin/Pagination'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatDateTime } from '@/utils/formatRelativeTime'

const LIMIT = 20
const STATUS_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
]
const ROLE_TABS: { value: VerificationRole | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'OWNER', label: 'Venue Registrations' },
  { value: 'REFEREE', label: 'Referee Licenses' },
]

export default function PendingApprovalsPage() {
  const [status, setStatus] = useState<VerificationStatus>('PENDING')
  const [role, setRole] = useState<VerificationRole | undefined>(undefined)
  const [offset, setOffset] = useState(0)
  const [items, setItems] = useState<VerificationRequestRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<VerificationRequestRow | null>(null)

  const { toast, showToast, closeToast } = useToast()

  const fetchList = useCallback(() => {
    setIsLoading(true)
    setError(null)
    adminService
      .listApprovals({ status, role, limit: LIMIT, offset })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Không tải được danh sách yêu cầu duyệt.')))
      .finally(() => setIsLoading(false))
  }, [status, role, offset])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openDetail = (row: VerificationRequestRow) => {
    adminService
      .getApproval(row.verificationReqId)
      .then((res) => setSelected(res.request))
      .catch((err) => showToast('error', getApiErrorMessage(err, 'Không tải được chi tiết yêu cầu.')))
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-admin-ink">Pending Approvals</h1>
      <p className="mb-6 text-sm text-admin-muted">Duyệt hồ sơ Venue Owner / Referee</p>

      <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-admin-border">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              setRole(tab.value)
              setOffset(0)
            }}
            className={`border-b-2 pb-3 text-sm font-medium ${
              role === tab.value
                ? 'border-admin-primary text-admin-primary'
                : 'border-transparent text-admin-muted hover:text-admin-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setStatus(opt.value)
              setOffset(0)
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              status === opt.value
                ? 'bg-admin-primary text-white'
                : 'bg-admin-surfaceMuted text-admin-muted hover:bg-admin-border'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-admin-border bg-white">
        {isLoading ? (
          <p className="p-6 text-sm text-admin-muted">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-admin-muted">Không có yêu cầu nào.</p>
        ) : (
          <ul>
            {items.map((row) => (
              <li key={row.verificationReqId} className="border-b border-admin-border last:border-0">
                <button
                  type="button"
                  onClick={() => openDetail(row)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-admin-surfaceMuted"
                >
                  <div>
                    <p className="font-semibold text-admin-ink">
                      {row.applicant?.fullName ?? row.applicant?.email ?? `User #${row.userId}`}
                    </p>
                    <p className="text-sm text-admin-muted">
                      {row.requestType} · {formatDateTime(row.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination total={total} limit={LIMIT} offset={offset} itemLabel="yêu cầu" onOffsetChange={setOffset} />
      </div>

      {selected && (
        <ApprovalDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onDone={(type, message) => {
            setSelected(null)
            showToast(type, message)
            fetchList()
          }}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

function ApprovalDetailModal({
  request,
  onClose,
  onDone,
}: {
  request: VerificationRequestRow
  onClose: () => void
  onDone: (type: 'success' | 'error', message: string) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [reason, setReason] = useState('')

  const handleApprove = () => {
    setIsSubmitting(true)
    adminService
      .approveRequest(request.verificationReqId)
      .then(() => onDone('success', 'Đã duyệt yêu cầu.'))
      .catch((err) => onDone('error', getApiErrorMessage(err, 'Duyệt yêu cầu thất bại.')))
      .finally(() => setIsSubmitting(false))
  }

  const handleReject = () => {
    setIsSubmitting(true)
    adminService
      .rejectRequest(request.verificationReqId, reason.trim() || undefined)
      .then(() => onDone('success', 'Đã từ chối yêu cầu.'))
      .catch((err) => onDone('error', getApiErrorMessage(err, 'Từ chối yêu cầu thất bại.')))
      .finally(() => setIsSubmitting(false))
  }

  return (
    <Modal title={request.applicant?.fullName ?? request.applicant?.email ?? `User #${request.userId}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="info">{request.requestType}</Badge>
          <Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-admin-muted">Email</dt>
            <dd className="text-admin-ink">{request.applicant?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-admin-muted">Số điện thoại</dt>
            <dd className="text-admin-ink">{request.applicant?.phoneNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-admin-muted">Gửi lúc</dt>
            <dd className="text-admin-ink">{formatDateTime(request.createdAt)}</dd>
          </div>
          {request.adminNotes && (
            <div className="col-span-2">
              <dt className="text-admin-muted">Ghi chú admin</dt>
              <dd className="text-admin-ink">{request.adminNotes}</dd>
            </div>
          )}
        </dl>

        <div>
          <p className="mb-1 text-xs font-semibold text-admin-muted">GIẤY TỜ ĐÍNH KÈM</p>
          <a
            href={request.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-admin-border px-4 py-3 text-sm font-medium text-admin-primary hover:bg-admin-surfaceMuted"
          >
            Xem giấy tờ →
          </a>
        </div>

        {request.status === 'PENDING' && (
          <div className="border-t border-admin-border pt-4">
            {showRejectForm ? (
              <div className="space-y-3">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Lý do từ chối (không bắt buộc)"
                  className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    disabled={isSubmitting}
                    className="rounded-md border border-admin-border px-4 py-2 text-sm font-medium text-admin-ink"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isSubmitting}
                    className="rounded-md bg-admin-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isSubmitting}
                  className="rounded-md border border-admin-danger px-4 py-2 text-sm font-semibold text-admin-danger disabled:opacity-60"
                >
                  Reject & Request Info
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-60"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Approve Request'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
