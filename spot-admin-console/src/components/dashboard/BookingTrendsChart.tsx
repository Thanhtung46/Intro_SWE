import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardSummary } from '../../types/owner'

interface BookingTrendsChartProps {
  points: DashboardSummary['bookingTrends']['points']
}

export function BookingTrendsChart({ points }: BookingTrendsChartProps) {
  return (
    <div className="owner-card">
      <p className="owner-kpi-card__label" style={{ marginBottom: 16 }}>
        Booking trends (last 4 weeks, Mon–Sun)
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={points}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="bookingCount" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
