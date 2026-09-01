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
import iconExport from '../assets/owner/export.svg'
import iconPlus from '../assets/owner/icon-plus.svg'
import type { DashboardSummary } from '../types/owner'

export function OwnerDashboardPage() {
  const venue = useOwnerStore((s) => s.venue)
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trendsWeeks, setTrendsWeeks] = useState(1)
  const [recentLimit, setRecentLimit] = useState(10)

  useEffect(() => {
    if (!venue) return
    setLoading(true)
    getDashboardSummary({ venueId: venue.venueId, trendsWeeks, recentLimit })
      .then(setSummary)
      .catch(() => setError('Could not load the dashboard.'))
      .finally(() => setLoading(false))
  }, [venue, trendsWeeks, recentLimit])

  if (!venue) {
    return <EmptyState title="No venue yet" description="Create a venue on the Facilities page first." />
  }
  if (loading) return <p>Loading dashboard…</p>
  if (error) return <p className="owner-error-text">{error}</p>
  if (!summary) return null

  const { kpis, bookingTrends, recentActivities, facilityCards } = summary

  return (
    <>
      <div className="owner-page-header">
        <div>
          <h1>Venue Dashboard</h1>
          <p>Good morning. Here&rsquo;s what&rsquo;s happening at {venue.name} today.</p>
        </div>
        <div className="owner-page-header__actions">
          <button className="owner-btn owner-btn--secondary">
            <img src={iconExport} alt="" width={11} />
            Export Report
          </button>
          <button className="owner-btn" onClick={() => navigate('/owner/schedule')}>
            <img src={iconPlus} alt="" width={13} style={{ filter: 'invert(1)' }} />
            Quick Booking
          </button>
        </div>
      </div>

      <div className="owner-kpi-grid">
        <KpiCard
          icon="revenue"
          label="Monthly Revenue"
          value={formatVnd(kpis.monthlyRevenue.amount)}
        />
        <KpiCard icon="occupancy" label="Occupancy Rate" value={`${kpis.occupancyRate.percent}%`} />
        <div onClick={() => navigate('/owner/schedule')} style={{ cursor: 'pointer' }}>
          <KpiCard
            icon="pending"
            label="Pending Bookings"
            value={String(kpis.pendingBookings.count)}
            badge={kpis.pendingBookings.urgentCount > 0 ? { text: 'Priority', tone: 'red' } : undefined}
            hint={kpis.pendingBookings.urgentCount > 0 ? 'Requires approval within 2h' : undefined}
          />
        </div>
        <KpiCard icon="reviews" label="New Reviews" value={String(kpis.newReviews.count)} />
      </div>

      <div className="owner-two-col">
        <BookingTrendsChart
          points={bookingTrends.points}
          trendsWeeks={trendsWeeks}
          onTrendsWeeksChange={setTrendsWeeks}
        />
        <ActivityFeed
          activities={recentActivities}
          canViewMore={recentLimit < 20 && recentActivities.length >= recentLimit}
          onViewAll={() => setRecentLimit(20)}
        />
      </div>

      <FacilityStatusRow facilities={facilityCards} />
    </>
  )
}
