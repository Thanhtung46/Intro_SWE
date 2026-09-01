'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import * as adminService from '@/services/admin.service'
import type { AuditLogRow, SystemSettings, UpdateSettingsPayload } from '@/types/admin'
import Toast from '@/components/admin/Toast'
import Pagination from '@/components/admin/Pagination'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatDateTime } from '@/utils/formatRelativeTime'

const AUDIT_LIMIT = 20

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, closeToast } = useToast()

  const auditRef = useRef<HTMLDivElement>(null)

  const fetchSettings = useCallback(() => {
    setIsLoading(true)
    setError(null)
    adminService
      .getSettings()
      .then((res) => setSettings(res.settings))
      .catch((err) => setError(getApiErrorMessage(err, 'Không tải được cấu hình hệ thống.')))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'audit') {
      auditRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-admin-ink">System Settings</h1>
      <p className="mb-6 text-sm text-admin-muted">Quản lý phí nền tảng, cổng thanh toán và Audit log</p>

      {isLoading && <p className="text-sm text-admin-muted">Đang tải...</p>}
      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}

      {settings && (
        <SettingsForm
          settings={settings}
          onSaved={(updated) => {
            setSettings(updated)
            showToast('success', 'Đã lưu cấu hình.')
          }}
          onError={(message) => showToast('error', message)}
        />
      )}

      <div ref={auditRef} className="mt-8">
        <AuditLogSection />
      </div>

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

function SettingsForm({
  settings,
  onSaved,
  onError,
}: {
  settings: SystemSettings
  onSaved: (settings: SystemSettings) => void
  onError: (message: string) => void
}) {
  const [commissionRatePercent, setCommissionRatePercent] = useState(settings.commissionRatePercent)
  const [momoEnabled, setMomoEnabled] = useState(settings.paymentGateways.momo.enabled)
  const [vnpayEnabled, setVnpayEnabled] = useState(settings.paymentGateways.vnpay.enabled)
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(settings.otpExpirySeconds)
  const [defaultCancellationWindowHours, setDefaultCancellationWindowHours] = useState(
    settings.defaultCancellationWindowHours
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const hasChanges =
    commissionRatePercent !== settings.commissionRatePercent ||
    momoEnabled !== settings.paymentGateways.momo.enabled ||
    vnpayEnabled !== settings.paymentGateways.vnpay.enabled ||
    otpExpirySeconds !== settings.otpExpirySeconds ||
    defaultCancellationWindowHours !== settings.defaultCancellationWindowHours

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (commissionRatePercent < 0 || commissionRatePercent > 100) {
      setValidationError('Commission rate phải trong khoảng 0-100.')
      return
    }
    if (otpExpirySeconds < 60 || otpExpirySeconds > 3600) {
      setValidationError('OTP expiry phải trong khoảng 60-3600 giây.')
      return
    }
    if (defaultCancellationWindowHours < 1 || defaultCancellationWindowHours > 168) {
      setValidationError('Cancellation window phải trong khoảng 1-168 giờ.')
      return
    }

    const payload: UpdateSettingsPayload = {}
    if (commissionRatePercent !== settings.commissionRatePercent) {
      payload.commissionRatePercent = commissionRatePercent
    }
    if (
      momoEnabled !== settings.paymentGateways.momo.enabled ||
      vnpayEnabled !== settings.paymentGateways.vnpay.enabled
    ) {
      payload.paymentGateways = { momo: { enabled: momoEnabled }, vnpay: { enabled: vnpayEnabled } }
    }
    if (otpExpirySeconds !== settings.otpExpirySeconds) {
      payload.otpExpirySeconds = otpExpirySeconds
    }
    if (defaultCancellationWindowHours !== settings.defaultCancellationWindowHours) {
      payload.defaultCancellationWindowHours = defaultCancellationWindowHours
    }

    setIsSubmitting(true)
    adminService
      .updateSettings(payload)
      .then((res) => onSaved(res.settings))
      .catch((err) => onError(getApiErrorMessage(err, 'Lưu cấu hình thất bại.')))
      .finally(() => setIsSubmitting(false))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-lg border border-admin-border bg-white p-5">
        <h2 className="text-lg font-semibold text-admin-ink">Commission Rate</h2>
        <p className="mb-4 text-sm text-admin-muted">
          {settings.updatedAt ? `Cập nhật lần cuối: ${formatDateTime(settings.updatedAt)}` : 'Chưa từng cập nhật'}
        </p>
        <label className="block max-w-xs">
          <span className="mb-1 block text-xs font-semibold text-admin-muted">TỶ LỆ HOA HỒNG (%)</span>
          <div className="flex items-center gap-2 rounded-md border border-admin-border bg-admin-surfaceMuted px-3 py-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={commissionRatePercent}
              onChange={(e) => setCommissionRatePercent(Number(e.target.value))}
              className="w-full bg-transparent text-sm text-admin-ink outline-none"
            />
            <span className="text-sm text-admin-muted">%</span>
          </div>
        </label>
      </section>

      <section className="rounded-lg border border-admin-border bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-admin-ink">Payment Gateways</h2>
        <div className="space-y-3">
          <GatewayToggle
            label="M"
            badgeColor="#a50064"
            name="MoMo Wallet (VN)"
            description="Regional e-wallet integration"
            enabled={momoEnabled}
            onToggle={setMomoEnabled}
          />
          <GatewayToggle
            label="VN"
            badgeColor="#005baa"
            name="VNPay"
            description="Vietnam payment gateway"
            enabled={vnpayEnabled}
            onToggle={setVnpayEnabled}
          />
        </div>
      </section>

      <section className="rounded-lg border border-admin-border bg-white p-5">
        <h2 className="text-lg font-semibold text-admin-ink">Platform Rules</h2>
        <p className="mb-4 text-sm text-admin-muted">Chưa có thiết kế Figma/Pencil riêng cho phần này — bố cục tự suy diễn theo dữ liệu API.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-admin-muted">OTP EXPIRY (giây, 60-3600)</span>
            <input
              type="number"
              min={60}
              max={3600}
              value={otpExpirySeconds}
              onChange={(e) => setOtpExpirySeconds(Number(e.target.value))}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-admin-muted">
              CỬA SỔ HUỶ MẶC ĐỊNH (giờ, 1-168)
            </span>
            <input
              type="number"
              min={1}
              max={168}
              value={defaultCancellationWindowHours}
              onChange={(e) => setDefaultCancellationWindowHours(Number(e.target.value))}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {validationError && (
        <p className="rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{validationError}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!hasChanges || isSubmitting}
          className="rounded-md bg-admin-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-50"
        >
          {isSubmitting ? 'Đang lưu...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function GatewayToggle({
  label,
  badgeColor,
  name,
  description,
  enabled,
  onToggle,
}: {
  label: string
  badgeColor: string
  name: string
  description: string
  enabled: boolean
  onToggle: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-admin-border px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ backgroundColor: badgeColor }}
        >
          {label}
        </span>
        <div>
          <p className="font-semibold text-admin-ink">{name}</p>
          <p className="text-sm text-admin-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-admin-primary' : 'bg-admin-border'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function AuditLogSection() {
  const [items, setItems] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    adminService
      .listAuditLog({ limit: AUDIT_LIMIT, offset })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Không tải được Audit Log.')))
      .finally(() => setIsLoading(false))
  }, [offset])

  return (
    <section className="rounded-lg border border-admin-border bg-white">
      <div className="border-b border-admin-border px-5 py-4">
        <h2 className="text-lg font-semibold text-admin-ink">Audit Log</h2>
        <p className="text-sm text-admin-muted">
          Chưa có thiết kế Figma/Pencil riêng — bảng đơn giản theo field của AuditLogRow.
        </p>
      </div>

      {error && <p className="px-5 py-4 text-sm text-admin-danger">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-admin-surfaceMuted text-xs font-bold uppercase text-admin-subtle">
            <tr>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Hành động</th>
              <th className="px-4 py-3">Đối tượng</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-admin-muted">
                  Đang tải...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-admin-muted">
                  Chưa có log nào.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <Fragment key={row.auditId}>
                  <tr
                    className="cursor-pointer border-t border-admin-border hover:bg-admin-surfaceMuted"
                    onClick={() => setExpandedId(expandedId === row.auditId ? null : row.auditId)}
                  >
                    <td className="px-4 py-3 text-admin-muted">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-3 text-admin-ink">{row.adminEmail ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-admin-ink">{row.action}</td>
                    <td className="px-4 py-3 text-admin-muted">
                      {row.targetType} #{row.targetId}
                    </td>
                  </tr>
                  {expandedId === row.auditId && (
                    <tr className="border-t border-admin-border bg-admin-surfaceMuted">
                      <td colSpan={4} className="px-4 py-3">
                        <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-admin-ink">
                          {JSON.stringify(row.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination total={total} limit={AUDIT_LIMIT} offset={offset} itemLabel="log" onOffsetChange={setOffset} />
    </section>
  )
}
