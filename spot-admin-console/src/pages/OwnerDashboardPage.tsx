import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KpiCard } from '../components/dashboard/KpiCard'
import { BookingTrendsChart } from '../components/dashboard/BookingTrendsChart'
import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import { FacilityStatusRow } from '../components/dashboard/FacilityStatusRow'
import { EmptyState } from '../components/common/EmptyState'
import { getDashboardSummary } from '../services/ownerApi'
import { useOwnerStore } from '../state/ownerStore'
import { formatVnd } from '../utils/format'
import type { DashboardSummary } from '../types/owner'

export function OwnerDashboardPage() {
  const venue = useOwnerStore((s) => s.venue)
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!venue) return
    setLoading(true)
    getDashboardSummary({ venueId: venue.venueId })
      .then(setSummary)
      .catch(() => setError('Could not load the dashboard.'))
      .finally(() => setLoading(false))
  }, [venue])

  if (!venue) {
    return <EmptyState title="No venue yet" description="Create a venue on the Facilities page first." />
  }
  if (loading) return <p>Loading dashboard…</p>
  if (error) return <p className="owner-error-text">{error}</p>
  if (!summary) return null

  const { kpis, bookingTrends, recentActivities, facilityCards } = summary

  return (
    <div>
      <div className="owner-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>{venue.name}</p>
        </div>
      </div>

      <div className="owner-kpi-grid">
        <KpiCard label="Monthly revenue" value={formatVnd(kpis.monthlyRevenue.amount)} />
        <KpiCard label="Occupancy rate" value={`${kpis.occupancyRate.percent}%`} />
        <div onClick={() => navigate('/owner/schedule')} style={{ cursor: 'pointer' }}>
          <KpiCard
            label="Pending bookings"
            value={String(kpis.pendingBookings.count)}
            hint={
              kpis.pendingBookings.urgentCount > 0
                ? `${kpis.pendingBookings.urgentCount} due within 2h`
                : undefined
            }
          />
        </div>
        <KpiCard label="New reviews" value={String(kpis.newReviews.count)} />
      </div>

      <div className="owner-two-col">
        <BookingTrendsChart points={bookingTrends.points} />
        <ActivityFeed activities={recentActivities} />
      </div>

      <FacilityStatusRow facilities={facilityCards} />
    </div>
  )
}
