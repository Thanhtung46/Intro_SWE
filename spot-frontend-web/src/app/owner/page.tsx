'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarCheck,
  Clock,
  Download,
  Gauge,
  ImageOff,
  Star,
  Wallet,
  Wrench,
} from 'lucide-react'
import * as ownerService from '@/services/owner.service'
import type { DashboardActivity, DashboardSummaryResponse, FacilityCard, OwnerVenueSummary } from '@/types/owner'
import { useAuthStore } from '@/state/authStore'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { getApiErrorMessage } from '@/utils/apiError'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function prevMonthOf(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = month === currentMonth() ? toDateStr(new Date()) : `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function percentChange(current: number, prev: number): number | null {
  if (prev <= 0) return null
  return Math.round(((current - prev) / prev) * 100)
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const TRENDS_WEEKS_OPTIONS = [
  { value: 1, label: 'This Week' },
  { value: 4, label: 'Last 4 Weeks' },
  { value: 12, label: 'Last 12 Weeks' },
]

interface VenueDetail {
  imageUrl: string | null
  openingHours: string | null
  closingHours: string | null
}

export default function OwnerDashboardPage() {
  const user = useAuthStore((s) => s.user)

  const [month, setMonth] = useState(currentMonth())
  const [venueId, setVenueId] = useState<number | ''>('')
  const [venues, setVenues] = useState<OwnerVenueSummary[]>([])
  const [trendsWeeks, setTrendsWeeks] = useState(4)
  const [recentLimit, setRecentLimit] = useState(10)

  const [data, setData] = useState<DashboardSummaryResponse | null>(null)
  const [prevData, setPrevData] = useState<DashboardSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [venueDetails, setVenueDetails] = useState<Record<number, VenueDetail>>({})

  useEffect(() => {
    ownerService
      .listVenues()
      .then((res) => setVenues(res.items))
      .catch(() => {
        // Non-fatal — the venue filter just stays empty if this fails.
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      ownerService.getDashboardSummary({ month, venueId: venueId || undefined, trendsWeeks, recentLimit }),
      ownerService
        .getDashboardSummary({ month: prevMonthOf(month), venueId: venueId || undefined })
        .catch(() => null),
    ])
      .then(([res, prevRes]) => {
        if (cancelled) return
        setData(res)
        setPrevData(prevRes)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Failed to load dashboard data.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [month, venueId, trendsWeeks, recentLimit])

  useEffect(() => {
    if (!data || data.facilityCards.length === 0) {
      setVenueDetails({})
      return
    }
    let cancelled = false
    const uniqueVenueIds = Array.from(new Set(data.facilityCards.map((c) => c.venueId)))
    Promise.all(
      uniqueVenueIds.map((id) =>
        ownerService
          .getVenue(id)
          .then((res) => [id, res] as const)
          .catch(() => [id, null] as const)
      )
    ).then((results) => {
      if (cancelled) return
      const next: Record<number, VenueDetail> = {}
      for (const [id, res] of results) {
        if (res) {
          next[id] = {
            imageUrl: res.images[0]?.imageUrl ?? null,
            openingHours: res.venue.openingHours,
            closingHours: res.venue.closingHours,
          }
        }
      }
      setVenueDetails(next)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const { from, to } = monthRange(month)
      const { blob, filename } = await ownerService.exportRevenueCsv({ from, to, venueId: venueId || undefined })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to export CSV report.'))
    } finally {
      setIsExporting(false)
    }
  }

  const revenueDelta =
    data && prevData ? percentChange(data.kpis.monthlyRevenue.amount, prevData.kpis.monthlyRevenue.amount) : null
  const occupancyDelta =
    data && prevData ? percentChange(data.kpis.occupancyRate.percent, prevData.kpis.occupancyRate.percent) : null

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Venue Dashboard</h1>
          <p className="text-sm text-admin-muted">
            {greeting()}, {user?.fullName ?? 'there'}. Here&apos;s what&apos;s happening at your facilities today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-admin-muted">
            Venue
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-md border border-admin-border px-3 py-1.5 text-admin-ink"
            >
              <option value="">All venues</option>
              {venues.map((v) => (
                <option key={v.venueId} value={v.venueId}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-admin-muted">
            Month
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-admin-border px-3 py-1.5 text-admin-ink"
            />
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-60"
          >
            <Download size={15} />
            {isExporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-admin-muted">Loading...</p>}
      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Wallet}
              iconBg="bg-admin-infoBg"
              iconColor="text-admin-info"
              label="MONTHLY REVENUE"
              value={formatCurrency(data.kpis.monthlyRevenue.amount, data.kpis.monthlyRevenue.currency)}
              delta={revenueDelta}
            />
            <MetricCard
              icon={Gauge}
              iconBg="bg-admin-purpleBg"
              iconColor="text-admin-purple"
              label="OCCUPANCY RATE"
              value={`${data.kpis.occupancyRate.percent}%`}
              delta={occupancyDelta}
            >
              <p className="mt-2 text-xs text-admin-subtle">
                {Math.round(data.kpis.occupancyRate.bookedHours)}/{Math.round(data.kpis.occupancyRate.availableHours)}{' '}
                hours booked
              </p>
            </MetricCard>
            <MetricCard
              icon={Clock}
              iconBg={data.kpis.pendingBookings.urgentCount > 0 ? 'bg-admin-dangerBg' : 'bg-admin-warningBg'}
              iconColor={data.kpis.pendingBookings.urgentCount > 0 ? 'text-admin-danger' : 'text-admin-warning'}
              label="PENDING BOOKINGS"
              value={String(data.kpis.pendingBookings.count)}
            >
              {data.kpis.pendingBookings.urgentCount > 0 && (
                <p className="mt-2 text-xs font-semibold text-admin-danger">
                  {data.kpis.pendingBookings.urgentCount} urgent, needs approval
                </p>
              )}
            </MetricCard>
            <MetricCard
              icon={Star}
              iconBg="bg-admin-successBg"
              iconColor="text-admin-success"
              label="NEW REVIEWS"
              value={String(data.kpis.newReviews.count)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex h-full flex-col rounded-lg border border-admin-border bg-white p-5 lg:col-span-2">
              <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-admin-ink">Booking Trends</h2>
                  <p className="text-sm text-admin-muted">Booking count by day of week</p>
                </div>
                <select
                  value={trendsWeeks}
                  onChange={(e) => setTrendsWeeks(Number(e.target.value))}
                  className="rounded-md border border-admin-border bg-white px-3 py-1.5 text-sm text-admin-ink"
                >
                  {TRENDS_WEEKS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex flex-1 flex-col justify-end">
                <BookingTrendsChart points={data.bookingTrends.points} />
              </div>
            </div>

            <div className="rounded-lg border border-admin-border bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-admin-ink">Recent Activities</h2>
                {recentLimit < 20 && data.recentActivities.length >= recentLimit && (
                  <button
                    type="button"
                    onClick={() => setRecentLimit(20)}
                    className="text-xs font-semibold text-admin-primary hover:underline"
                  >
                    View All
                  </button>
                )}
              </div>
              {data.recentActivities.length === 0 ? (
                <p className="text-sm text-admin-muted">No recent activity.</p>
              ) : (
                <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {data.recentActivities.map((activity) => (
                    <ActivityRow key={`${activity.type}-${activity.referenceId}`} activity={activity} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-4 text-lg font-semibold text-admin-ink">Facility Status</h2>
            {data.facilityCards.length === 0 ? (
              <p className="text-sm text-admin-muted">No facilities yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.facilityCards.map((card) => (
                  <FacilityStatusCard key={card.fieldId} card={card} detail={venueDetails[card.venueId]} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null
  const positive = value >= 0
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
        positive ? 'bg-admin-successBg text-admin-success' : 'bg-admin-dangerBg text-admin-danger'
      }`}
    >
      {positive ? '+' : ''}
      {value}%
    </span>
  )
}

function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  delta,
  children,
}: {
  icon: typeof Wallet
  iconBg: string
  iconColor: string
  label: string
  value: string
  delta?: number | null
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-admin-border bg-white p-5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-md ${iconBg} ${iconColor}`}>
        <Icon size={18} />
      </span>
      <p className="mt-3 text-xs font-semibold text-admin-muted">{label}</p>
      <div className="mt-1 flex items-center">
        <p className="text-2xl font-bold text-admin-ink">{value}</p>
        <DeltaBadge value={delta ?? null} />
      </div>
      {children}
    </div>
  )
}

function BookingTrendsChart({ points }: { points: { dayOfWeek: number; label: string; bookingCount: number }[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-admin-muted">No booking data yet.</p>
  }

  const max = Math.max(...points.map((p) => p.bookingCount), 1)

  return (
    <div>
      <div className="flex h-56 items-end gap-2">
        {points.map((point) => (
          <div key={point.dayOfWeek} className="flex h-full flex-1 flex-col items-center justify-end">
            {point.bookingCount > 0 && (
              <span className="mb-1 text-[10px] font-semibold text-admin-ink">{point.bookingCount}</span>
            )}
            <div
              className="w-full rounded-t-md bg-admin-primary"
              style={{ height: `${Math.max((point.bookingCount / max) * 100, 2)}%` }}
              title={`${point.label}: ${point.bookingCount}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {points.map((point) => (
          <span key={point.dayOfWeek} className="flex-1 text-center text-[10px] text-admin-muted">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function ActivityRow({ activity }: { activity: DashboardActivity }) {
  const isReview = activity.type === 'REVIEW_CREATED'
  return (
    <li className="flex items-start gap-3 border-b border-admin-border pb-3 last:border-0 last:pb-0">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isReview ? 'bg-admin-warningBg text-admin-warning' : 'bg-admin-infoBg text-admin-info'
        }`}
      >
        {isReview ? <Star size={15} /> : <CalendarCheck size={15} />}
      </span>
      <div>
        <p className="text-sm font-semibold text-admin-ink">{activity.title}</p>
        <p className="text-xs text-admin-muted">
          {activity.venueName}
          {isReview && activity.type === 'REVIEW_CREATED' && <> · {activity.rating}★</>}
          {!isReview && activity.type === 'BOOKING_CREATED' && <> · {activity.status}</>}
          {' · '}
          {formatRelativeTime(activity.occurredAt)}
        </p>
      </div>
    </li>
  )
}

function FacilityStatusCard({ card, detail }: { card: FacilityCard; detail?: VenueDetail }) {
  return (
    <div className="overflow-hidden rounded-lg border border-admin-border bg-white">
      <div className="h-28 w-full bg-admin-surfaceMuted">
        {detail?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.imageUrl}
            alt={card.venueName}
            className="h-28 w-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="flex h-28 w-full items-center justify-center text-admin-subtle">
            <ImageOff size={22} />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-admin-ink">{card.fieldName}</p>
        <p className="text-sm text-admin-muted">{card.venueName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-admin-infoBg px-2 py-0.5 font-semibold text-admin-info">
            {card.sportType}
          </span>
          <FacilityStatusBadge card={card} detail={detail} />
        </div>
        <Link
          href={`/owner/facilities/${card.venueId}`}
          className="mt-3 inline-block text-xs font-semibold text-admin-primary hover:underline"
        >
          Manage &rarr;
        </Link>
      </div>
    </div>
  )
}

function FacilityStatusBadge({ card, detail }: { card: FacilityCard; detail?: VenueDetail }) {
  if (card.isAvailableNow) {
    return (
      <span className="rounded-full bg-admin-successBg px-2 py-0.5 font-semibold text-admin-success">
        Available now
      </span>
    )
  }
  if (card.status === 'MAINTENANCE') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-admin-dangerBg px-2 py-0.5 font-semibold text-admin-danger">
        <Wrench size={11} />
        {card.status}
      </span>
    )
  }
  if (card.status === 'ACTIVE' && detail?.openingHours && detail?.closingHours) {
    return (
      <span className="rounded-full bg-admin-surfaceMuted px-2 py-0.5 font-semibold text-admin-muted">
        Active: {detail.openingHours}&ndash;{detail.closingHours}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-admin-surfaceMuted px-2 py-0.5 font-semibold text-admin-muted">
      {card.status}
    </span>
  )
}
