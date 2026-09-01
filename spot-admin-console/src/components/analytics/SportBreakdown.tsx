import { formatVnd } from '../../utils/format'
import type { RevenueBySport } from '../../types/owner'

export function SportBreakdown({ bySport }: { bySport: RevenueBySport[] }) {
  const total = bySport.reduce((sum, s) => sum + s.revenue, 0) || 1

  return (
    <div className="owner-card">
      <h2 className="owner-section-title" style={{ marginBottom: 24 }}>
        Yield by Sport
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {bySport.map((sport, i) => {
          const percent = Math.round((sport.revenue / total) * 100)
          const isFirst = i === 0
          return (
            <div className="owner-sport-row" key={sport.sportType}>
              <div className="owner-sport-row__top">
                <span className="owner-sport-row__label">
                  {sport.sportType === 'Badminton' ? '\u{1F3F8}' : '⚽'} {sport.sportType}
                </span>
                <span className="owner-sport-row__amount">{formatVnd(sport.revenue)}</span>
              </div>
              <div className="owner-sport-row__track">
                <div
                  className={isFirst ? 'owner-sport-row__fill' : 'owner-sport-row__fill owner-sport-row__fill--amber'}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="owner-sport-row__caption">{percent}% of Total Volume</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
