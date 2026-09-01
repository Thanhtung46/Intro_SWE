import { useCallback, useEffect, useState } from 'react'
import { ReviewMetrics } from '../components/reviews/ReviewMetrics'
import { ReviewItem } from '../components/reviews/ReviewItem'
import { EmptyState } from '../components/common/EmptyState'
import { listReviews } from '../services/ownerApi'
import { useOwnerStore } from '../state/ownerStore'
import type { Review } from '../types/owner'

type Tab = 'ALL' | 'UNREPLIED'

export function OwnerReviewsPage() {
  const venue = useOwnerStore((s) => s.venue)
  const [tab, setTab] = useState<Tab>('ALL')
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!venue) return
    setLoading(true)
    setError(null)
    try {
      const result = await listReviews({
        venueId: venue.venueId,
        hasReply: tab === 'UNREPLIED' ? false : undefined,
        limit: 50,
      })
      setReviews(result.items)
    } catch {
      setError('Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }, [venue, tab])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!venue) {
    return <EmptyState title="No venue yet" description="Create a venue on the Facilities page first." />
  }

  return (
    <>
      <div className="owner-page-header">
        <div>
          <h1>Customer Reviews & Feedback</h1>
          <p>{venue.name}</p>
        </div>
      </div>

      {reviews.length === 0 && !loading ? (
        <EmptyState title="No reviews yet" />
      ) : (
        <>
          <ReviewMetrics reviews={reviews} />

          <div className="owner-tabs" style={{ marginTop: 16 }}>
            {(['ALL', 'UNREPLIED'] as const).map((t) => (
              <button
                key={t}
                className={`owner-tabs__btn ${tab === t ? 'owner-tabs__btn--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'ALL' ? 'All' : 'Unreplied'}
              </button>
            ))}
          </div>

          <div className="owner-card">
            {loading && <p>Loading…</p>}
            {error && <p className="owner-error-text">{error}</p>}
            {!loading && reviews.length === 0 && <EmptyState title="No reviews in this filter" />}
            {reviews.map((review) => (
              <ReviewItem key={review.reviewId} review={review} onReplied={() => void reload()} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
