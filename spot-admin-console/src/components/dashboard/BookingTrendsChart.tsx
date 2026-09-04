import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { DashboardSummary } from '../../types/owner'

interface BookingTrendsChartProps {
  points: DashboardSummary['bookingTrends']['points']
  trendsWeeks: number
  onTrendsWeeksChange: (weeks: number) => void
}

const PERIOD_OPTIONS = [
  { label: 'This Week', weeks: 1 },
  { label: 'This Month', weeks: 4 },
  { label: 'Last 3 Months', weeks: 12 },
]

export function BookingTrendsChart({ points, trendsWeeks, onTrendsWeeksChange }: BookingTrendsChartProps) {
  const peak = points.reduce((max, p) => Math.max(max, p.bookingCount), 0)

  return (
    <div className="owner-panel">
      <div className="owner-panel__header">
        <div>
          <h2 className="owner-panel__title">Booking Trends</h2>
          <p className="owner-panel__subtitle">Weekly utilization comparison across all courts.</p>
        </div>
        <select
          className="owner-btn owner-btn--secondary"
          value={trendsWeeks}
          onChange={(e) => onTrendsWeeksChange(Number(e.target.value))}
          style={{ cursor: 'pointer' }}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.weeks} value={opt.weeks}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ padding: '24px', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 24, left: 0, right: 0, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#64748b" />
            <Tooltip cursor={{ fill: 'rgba(0,74,198,0.06)' }} />
            <Bar dataKey="bookingCount" radius={[12, 12, 0, 0]} maxBarSize={40}>
              {points.map((p) => (
                <Cell key={p.label} fill={p.bookingCount === peak ? '#0f172a' : '#eff6ff'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
