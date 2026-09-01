import { useEffect, useState } from 'react'
import { RevenueChart } from '../components/analytics/RevenueChart'
import { SportBreakdown } from '../components/analytics/SportBreakdown'
import { PayoutCard, PayoutHistoryTable } from '../components/analytics/Payout'
import { EmptyState } from '../components/common/EmptyState'
import { getRevenueSummary, getRevenueTimeseries } from '../services/ownerApi'
import { useOwnerStore } from '../state/ownerStore'
import type { RevenuePoint, RevenueSummary } from '../types/owner'

function last90DaysRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 90)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export function OwnerRevenuePage() {
  const venue = useOwnerStore((s) => s.venue)
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [points, setPoints] = useState<RevenuePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!venue) return
    const { from, to } = last90DaysRange()
    setLoading(true)
    Promise.all([
      getRevenueSummary({ from, to, venueId: venue.venueId }),
      getRevenueTimeseries({ from, to, granularity: 'week', venueId: venue.venueId }),
    ])
      .then(([summaryData, timeseries]) => {
        setSummary(summaryData)
        setPoints(timeseries.points)
      })
      .catch(() => setError('Could not load revenue data.'))
      .finally(() => setLoading(false))
  }, [venue])

  if (!venue) {
    return <EmptyState title="No venue yet" description="Create a venue on the Facilities page first." />
  }
  if (loading) return <p>Loading revenue…</p>
  if (error) return <p className="owner-error-text">{error}</p>

  const hasRevenue = summary && summary.totalRevenue > 0

  return (
    <div>
      <div className="owner-page-header">
        <div>
          <h1>Revenue & Payouts</h1>
          <p>{venue.name}</p>
        </div>
      </div>

      {!hasRevenue ? (
        <EmptyState title="No revenue in the last 90 days" description="Completed bookings will show up here." />
      ) : (
        <>
          <div className="owner-two-col">
            <RevenueChart points={points} />
            <SportBreakdown bySport={summary!.bySport} />
          </div>
          <div className="owner-two-col" style={{ marginTop: 16 }}>
            <PayoutHistoryTable points={points} />
            <PayoutCard points={points} />
          </div>
        </>
      )}
    </div>
  )
}
