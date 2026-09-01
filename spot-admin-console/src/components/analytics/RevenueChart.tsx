import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatVnd } from '../../utils/format'
import type { RevenuePoint } from '../../types/owner'

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const data = points.map((p) => ({
    label: new Date(p.periodStart).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
    revenue: p.revenue,
  }))

  return (
    <div className="owner-card">
      <p className="owner-kpi-card__label" style={{ marginBottom: 16 }}>
        Revenue performance
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatVnd(v)} width={90} />
          <Tooltip formatter={(v: number) => formatVnd(v)} />
          <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
