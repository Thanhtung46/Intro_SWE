import { formatVnd } from '../../utils/format'
import type { RevenueBySport } from '../../types/owner'

export function SportBreakdown({ bySport }: { bySport: RevenueBySport[] }) {
  const total = bySport.reduce((sum, s) => sum + s.revenue, 0) || 1

  return (
    <div className="owner-card">
      <p className="owner-kpi-card__label" style={{ marginBottom: 16 }}>
        Yield by sport
      </p>
      {bySport.map((sport) => {
        const percent = Math.round((sport.revenue / total) * 100)
        return (
          <div key={sport.sportType} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
              <span>{sport.sportType}</span>
              <span>{formatVnd(sport.revenue)}</span>
            </div>
            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999 }}>
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: '#2563eb',
                  borderRadius: 999,
                }}
              />
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{percent}% of total volume</p>
          </div>
        )
      })}
    </div>
  )
}
