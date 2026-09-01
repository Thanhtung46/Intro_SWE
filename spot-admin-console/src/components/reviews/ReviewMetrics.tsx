import type { Review } from '../../types/owner'

function sentimentBucket(rating: number): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
  if (rating >= 4) return 'POSITIVE'
  if (rating === 3) return 'NEUTRAL'
  return 'NEGATIVE'
}

export function ReviewMetrics({ reviews }: { reviews: Review[] }) {
  const total = reviews.length
  const avg = total ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0
  const buckets = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 }
  reviews.forEach((r) => {
    buckets[sentimentBucket(r.rating)] += 1
  })

  return (
    <div className="owner-kpi-grid">
      <div className="owner-card owner-kpi-card">
        <p className="owner-kpi-card__label">Average Rating</p>
        <p className="owner-kpi-card__value">
          {avg.toFixed(1)} <span style={{ color: '#f59e0b' }}>★</span>
        </p>
      </div>
      <div className="owner-card owner-kpi-card">
        <p className="owner-kpi-card__label">Total Reviews</p>
        <p className="owner-kpi-card__value">{total}</p>
      </div>
      <div className="owner-card">
        <p className="owner-kpi-card__label" style={{ marginBottom: 12 }}>
          Sentiment Breakdown
        </p>
        {(['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const).map((key) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{key === 'POSITIVE' ? 'Positive' : key === 'NEUTRAL' ? 'Neutral' : 'Negative'}</span>
              <span>{total ? Math.round((buckets[key] / total) * 100) : 0}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--owner-muted-bg)', borderRadius: 999 }}>
              <div
                style={{
                  width: `${total ? Math.round((buckets[key] / total) * 100) : 0}%`,
                  height: '100%',
                  borderRadius: 999,
                  background:
                    key === 'POSITIVE' ? '#16a34a' : key === 'NEUTRAL' ? '#f59e0b' : '#dc2626',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
