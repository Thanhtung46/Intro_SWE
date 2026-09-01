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

  return (
    <div className="owner-review-item">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>{review.playerName ?? 'Player'}</strong>
        <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
      </div>
      <p style={{ margin: '4px 0' }}>{review.reviewText}</p>
      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
      </p>

      {review.hasReply && review.replyText && (
        <div className="owner-review-item__reply">
          <strong>Your reply</strong>
          <p style={{ margin: '4px 0 0' }}>{review.replyText}</p>
        </div>
      )}

      {!review.hasReply && !replying && (
        <button className="owner-btn owner-btn--secondary" style={{ marginTop: 8 }} onClick={() => setReplying(true)}>
          Reply
        </button>
      )}

      {!review.hasReply && replying && (
        <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
          <div className="owner-field">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
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
