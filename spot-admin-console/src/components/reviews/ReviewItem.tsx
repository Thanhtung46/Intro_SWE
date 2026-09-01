import { useState, type FormEvent } from 'react'
import { replyToReview } from '../../services/ownerApi'
import type { Review } from '../../types/owner'

export function ReviewItem({ review, onReplied }: { review: Review; onReplied: () => void }) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      await replyToReview(review.reviewId, replyText)
      setReplying(false)
      onReplied()
    } finally {
      setSubmitting(false)
    }
  }

  const initial = (review.playerName ?? 'P').charAt(0).toUpperCase()

  return (
    <div className="owner-review-item">
      <div className="owner-review-item__head">
        <div className="owner-review-item__avatar">{initial}</div>
        <div style={{ flex: 1 }}>
          <p className="owner-review-item__name">{review.playerName ?? 'Player'}</p>
          <span className="owner-review-item__stars">
            {'★'.repeat(review.rating)}
            {'☆'.repeat(5 - review.rating)}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--owner-text-muted)' }}>
          {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <p className="owner-review-item__text">&ldquo;{review.reviewText}&rdquo;</p>

      {review.hasReply && review.replyText && (
        <div className="owner-review-item__reply">
          <div className="owner-review-item__reply-label">Your reply</div>
          <p style={{ margin: '4px 0 0' }}>{review.replyText}</p>
        </div>
      )}

      {!review.hasReply && !replying && (
        <button
          className="owner-btn owner-btn--secondary"
          style={{ marginLeft: 60 }}
          onClick={() => setReplying(true)}
        >
          Reply
        </button>
      )}

      {!review.hasReply && replying && (
        <form onSubmit={handleSubmit} style={{ marginLeft: 60 }}>
          <div className="owner-field">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="owner-btn" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reply'}
            </button>
            <button className="owner-btn owner-btn--secondary" type="button" onClick={() => setReplying(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
