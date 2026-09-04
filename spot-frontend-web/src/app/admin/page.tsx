'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import * as adminService from '@/services/admin.service'
import type { AuditLogRow, DashboardSummaryResponse } from '@/types/admin'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { getApiErrorMessage } from '@/utils/apiError'

const REGISTRATION_DAY_OPTIONS = [7, 14, 30, 60, 90]

export default function AdminDashboardPage() {
  const [registrationDays, setRegistrationDays] = useState(30)
  const [data, setData] = useState<DashboardSummaryResponse | null>(null)
  const [recentActivity, setRecentActivity] = useState<AuditLogRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      adminService.getDashboardSummary(registrationDays),
      adminService.listAuditLog({ limit: 5, offset: 0 }),
    ])
      .then(([summaryRes, auditRes]) => {
        if (cancelled) return
        setData(summaryRes)
        setRecentActivity(auditRes.items)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Không tải được dữ liệu dashboard.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [registrationDays])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Welcome back, Admin!</h1>
          <p className="text-sm text-admin-muted">Tổng quan hệ thống SPOT</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-admin-muted">
          Khoảng thời gian đăng ký
          <select
            value={registrationDays}
            onChange={(e) => setRegistrationDays(Number(e.target.value))}
            className="rounded-md border border-admin-border px-3 py-1.5 text-admin-ink"
          >
            {REGISTRATION_DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} ngày
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p className="text-sm text-admin-muted">Đang tải...</p>}
      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="TỔNG DOANH THU" value={formatCurrency(data.summary.revenueTotal, data.summary.revenueCurrency)}>
              {data.summary.revenueSource === 'stub' && (
                <p className="mt-2 text-xs text-admin-subtle">
                  Dữ liệu doanh thu đang là 0 (chưa có giao dịch thật).
                </p>
              )}
            </MetricCard>
            <MetricCard label="TỔNG NGƯỜI DÙNG" value={data.summary.totalUsers.toLocaleString('vi-VN')} />
            <MetricCard label="CHỜ DUYỆT" value={String(data.summary.pendingApprovals).padStart(2, '0')}>
              <Link href="/admin/approvals" className="mt-2 inline-block text-xs font-bold text-admin-primary hover:underline">
                Xem tất cả
              </Link>
            </MetricCard>
            <MetricCard label="DOANH THU THEO NGUỒN" value="">
              <div className="mt-1 space-y-1 text-sm text-admin-ink">
                <div className="flex justify-between">
                  <span className="text-admin-muted">Booking sân</span>
                  <span className="font-semibold">
                    {formatCurrency(data.summary.revenueBreakdown.bookings, data.summary.revenueCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-admin-muted">Kèo (matchmaking)</span>
                  <span className="font-semibold">
                    {formatCurrency(data.summary.revenueBreakdown.matchmaking, data.summary.revenueCurrency)}
                  </span>
                </div>
              </div>
            </MetricCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-admin-border bg-white p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold text-admin-ink">Người dùng đăng ký theo ngày</h2>
              <p className="mb-4 text-sm text-admin-muted">
                {registrationDays} ngày gần nhất
              </p>
              <RegistrationBarChart points={data.userRegistrations} />
            </div>

            <div className="rounded-lg border border-admin-border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-admin-ink">Hoạt động gần đây</h2>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-admin-muted">Chưa có hoạt động nào.</p>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((item) => (
                    <li key={item.auditId} className="border-b border-admin-border pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-admin-ink">
                        {item.action} — {item.targetType} #{item.targetId}
                      </p>
                      <p className="text-xs text-admin-muted">
                        {item.adminEmail ?? 'admin'} · {formatRelativeTime(item.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/admin/settings?tab=audit"
                className="mt-4 block rounded-md border border-admin-border py-2 text-center text-sm font-semibold text-admin-muted hover:bg-admin-surfaceMuted"
              >
                Xem Audit Log
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-admin-border bg-white p-5">
      <p className="text-xs font-semibold text-admin-muted">{label}</p>
      {value && <p className="mt-2 text-3xl font-bold text-admin-ink">{value}</p>}
      {children}
    </div>
  )
}

function RegistrationBarChart({ points }: { points: { day: string; count: number }[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-admin-muted">Chưa có dữ liệu đăng ký.</p>
  }

  const max = Math.max(...points.map((p) => p.count), 1)

  return (
    <div className="overflow-x-auto">
      <div className="flex h-40 items-end gap-1">
        {points.map((point) => (
          <div key={point.day} className="flex h-full min-w-[24px] flex-1 flex-col items-end justify-end">
            <div
              className="w-full rounded-t bg-admin-primary"
              style={{ height: `${Math.max((point.count / max) * 100, 2)}%` }}
              title={`${point.day}: ${point.count}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {points.map((point) => (
          <span
            key={point.day}
            className="min-w-[24px] flex-1 text-center text-[10px] text-admin-muted"
          >
            {new Date(point.day).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
          </span>
        ))}
      </div>
    </div>
  )
}
