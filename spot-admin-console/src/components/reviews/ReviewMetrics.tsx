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
      <div className="owner-card">
        <p className="owner-kpi-card__label">Average rating</p>
        <p className="owner-kpi-card__value">{avg.toFixed(1)} ★</p>
      </div>
      <div className="owner-card">
        <p className="owner-kpi-card__label">Total reviews</p>
        <p className="owner-kpi-card__value">{total}</p>
      </div>
      <div className="owner-card">
        <p className="owner-kpi-card__label">Sentiment</p>
        {(['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const).map((key) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>{key}</span>
            <span>{total ? Math.round((buckets[key] / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
