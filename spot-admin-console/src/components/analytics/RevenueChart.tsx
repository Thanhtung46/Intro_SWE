import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatVnd } from '../../utils/format'
import type { RevenuePoint } from '../../types/owner'

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const data = points.map((p) => ({
    label: new Date(p.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: p.revenue,
  }))

  return (
    <div className="owner-panel">
      <div className="owner-panel__header">
        <div>
          <h2 className="owner-panel__title" style={{ fontSize: 24 }}>
            Performance Overview
          </h2>
        </div>
      </div>
      <div style={{ padding: 24, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="ownerRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#004ac6" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#004ac6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              stroke="#64748b"
              tickFormatter={(v) => formatVnd(v)}
              width={90}
            />
            <Tooltip formatter={(v: number) => formatVnd(v)} />
            <Area type="monotone" dataKey="revenue" stroke="#004ac6" strokeWidth={2} fill="url(#ownerRevenueFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
