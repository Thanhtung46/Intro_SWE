'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CircleDot, Feather } from 'lucide-react'
import * as ownerService from '@/services/owner.service'
import type { RevenueSummaryResponse, RevenueTimeseriesPoint, SportType } from '@/types/owner'
import { formatCurrency } from '@/utils/formatCurrency'
import { getApiErrorMessage } from '@/utils/apiError'

type DatePreset = 'last7' | 'last30' | 'last3months' | 'thisMonth'

const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last3months', label: 'Last 3 Months' },
  { value: 'thisMonth', label: 'This Month' },
]

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function presetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date()
  const to = toDateStr(now)
  if (preset === 'last7') {
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    return { from: toDateStr(from), to }
  }
  if (preset === 'last3months') {
    const from = new Date(now)
    from.setMonth(from.getMonth() - 3)
    return { from: toDateStr(from), to }
  }
  if (preset === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: toDateStr(from), to }
  }
  const from = new Date(now)
  from.setDate(from.getDate() - 29)
  return { from: toDateStr(from), to }
}

const SPORTS: { value: SportType; label: string; color: string; icon: typeof CircleDot }[] = [
  { value: 'Football', label: 'FOOTBALL', color: '#004ac6', icon: CircleDot },
  { value: 'Badminton', label: 'BADMINTON', color: '#996100', icon: Feather },
]

function sportMeta(sportType: string) {
  return SPORTS.find((s) => s.value === sportType) ?? SPORTS[0]
}

interface SportPoint {
  period: string
  football: number
  badminton: number
}

function mergeSportPoints(
  football: RevenueTimeseriesPoint[],
  badminton: RevenueTimeseriesPoint[]
): SportPoint[] {
  const map = new Map<string, SportPoint>()
  for (const p of football) {
    map.set(p.period, { period: p.period, football: p.revenue, badminton: 0 })
  }
  for (const p of badminton) {
    const existing = map.get(p.period)
    if (existing) {
      existing.badminton = p.revenue
    } else {
      map.set(p.period, { period: p.period, football: 0, badminton: p.revenue })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period))
}

export default function RevenuePage() {
  const searchParams = useSearchParams()
  const venueIdParam = searchParams.get('venueId')
  const venueId = venueIdParam ? Number(venueIdParam) : undefined

  const [preset, setPreset] = useState<DatePreset>('last30')
  const { from, to } = useMemo(() => presetRange(preset), [preset])

  const [venueName, setVenueName] = useState<string | null>(null)
  const [summary, setSummary] = useState<RevenueSummaryResponse | null>(null)
  const [sportPoints, setSportPoints] = useState<SportPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!venueId) {
      setVenueName(null)
      return
    }
    ownerService
      .getVenue(venueId)
      .then((res) => setVenueName(res.venue.name))
      .catch(() => setVenueName(null))
  }, [venueId])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      ownerService.getRevenueSummary({ from, to, venueId }),
      ownerService.getRevenueTimeseries({ from, to, sport: 'Football', granularity: 'month', venueId }),
      ownerService.getRevenueTimeseries({ from, to, sport: 'Badminton', granularity: 'month', venueId }),
    ])
      .then(([summaryRes, footballRes, badmintonRes]) => {
        if (cancelled) return
        setSummary(summaryRes)
        setSportPoints(mergeSportPoints(footballRes.points, badmintonRes.points))
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err, 'Failed to load revenue data.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [from, to, venueId])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const { blob, filename } = await ownerService.exportRevenueCsv({ from, to, venueId })
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Revenue Performance</h1>
          <p className="text-sm text-admin-muted">
            Analyze your earnings, sport-specific breakdowns, and payout history.
          </p>
          {venueId && (
            <p className="mt-1 text-xs text-admin-primary">
              Filtered by venue: {venueName ?? `#${venueId}`} ·{' '}
              <Link href="/owner/revenue" className="underline hover:no-underline">
                Clear filter
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as DatePreset)}
            className="rounded-md border border-admin-border bg-white px-3 py-2 text-sm font-medium text-admin-ink"
          >
            {DATE_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-60"
          >
            {isExporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-admin-muted">Loading...</p>}
      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}

      {summary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-admin-border bg-white p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-admin-ink">Income Trend</h2>
              <div className="flex items-center gap-2">
                {SPORTS.map((s) => (
                  <span
                    key={s.value}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ backgroundColor: `${s.color}1a`, color: s.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <SportTimeseriesChart points={sportPoints} />
            </div>
          </div>

          <div className="rounded-lg border border-admin-border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-admin-ink">Yield by Sport</h2>
            {summary.bySport.length === 0 ? (
              <p className="text-sm text-admin-muted">No revenue in this period yet.</p>
            ) : (
              <div className="space-y-4">
                {summary.bySport.map((row) => {
                  const meta = sportMeta(row.sportType)
                  const Icon = meta.icon
                  const percent =
                    summary.totalRevenue > 0 ? Math.round((row.revenue / summary.totalRevenue) * 100) : 0
                  return (
                    <div key={row.sportType}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 font-medium text-admin-ink">
                          <Icon size={15} style={{ color: meta.color }} />
                          {row.sportType}
                        </span>
                        <span className="font-semibold text-admin-ink">
                          {formatCurrency(row.revenue, summary.currency)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-admin-surfaceMuted">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: meta.color }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-admin-muted">{percent}% of Total Volume</p>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Recent Payouts / Earnings Insights / Average Hourly Rate / Scheduled Payout — out of scope, no backend API yet */}
          </div>
        </div>
      )}
    </div>
  )
}

function SportTimeseriesChart({ points }: { points: SportPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-admin-muted">No data yet.</p>
  }

  const max = Math.max(...points.flatMap((p) => [p.football, p.badminton]), 1)
  const barHeight = (value: number) => (value > 0 ? `${Math.max((value / max) * 100, 2)}%` : '0%')

  return (
    <div className="overflow-x-auto">
      <div className="flex h-56 min-w-max items-end gap-4">
        {points.map((point) => (
          <div key={point.period} className="flex h-full min-w-[56px] flex-1 flex-col items-end justify-end">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                className="w-4 rounded-t"
                style={{ height: barHeight(point.football), backgroundColor: SPORTS[0].color }}
                title={`Football: ${point.football}`}
              />
              <div
                className="w-4 rounded-t"
                style={{ height: barHeight(point.badminton), backgroundColor: SPORTS[1].color }}
                title={`Badminton: ${point.badminton}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex min-w-max gap-4">
        {points.map((point) => (
          <span key={point.period} className="min-w-[56px] flex-1 text-center text-[10px] text-admin-muted">
            {new Date(point.period).toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  )
}
