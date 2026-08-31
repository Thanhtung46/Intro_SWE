'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Star } from 'lucide-react'
import * as ownerService from '@/services/owner.service'
import type { OwnerReviewDetail, OwnerReviewListItem } from '@/types/owner'
import Badge from '@/components/admin/Badge'
import Modal from '@/components/admin/Modal'
import Toast from '@/components/admin/Toast'
import Pagination from '@/components/admin/Pagination'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/utils/apiError'

const LIMIT = 20

type ReviewTab = 'all' | 'needsReply' | '5stars' | '1to2stars'

const TABS: { value: ReviewTab; label: string }[] = [
  { value: 'all', label: 'All Reviews' },
  { value: 'needsReply', label: 'Needs Reply' },
  { value: '5stars', label: '5 Stars' },
  { value: '1to2stars', label: '1-2 Stars' },
]

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} stars`}>
      {'★'.repeat(rating)}
      <span className="text-admin-border">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

function initials(name: string | null): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const letters = parts.map((p) => p[0]?.toUpperCase()).join('')
  return letters || 'U'
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function relativeDate(iso: string): string {
  const date = new Date(iso)
  const diffDays = Math.round((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
}

interface RatingCounts {
  counts: Record<number, number>
  total: number
}

async function fetchRatingCounts(params: { from?: string; to?: string }): Promise<RatingCounts> {
  const ratings = [1, 2, 3, 4, 5] as const
  const results = await Promise.all(
    ratings.map((r) => ownerService.listReviews({ ...params, rating: r, limit: 1, offset: 0 }))
  )
  const counts: Record<number, number> = {}
  ratings.forEach((r, i) => {
    counts[r] = results[i].total
  })
  const total = ratings.reduce((sum, r) => sum + counts[r], 0)
  return { counts, total }
}

function avgRatingOf(rc: RatingCounts): number | null {
  if (rc.total === 0) return null
  const sum = [1, 2, 3, 4, 5].reduce((s, r) => s + r * (rc.counts[r] ?? 0), 0)
  return sum / rc.total
}

interface ReviewStats {
  allTime: RatingCounts
  thisMonth: RatingCounts
  lastMonth: RatingCounts
  newThisWeek: number
}

function RatingDeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null
  const positive = value >= 0
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
        positive ? 'bg-admin-successBg text-admin-success' : 'bg-admin-dangerBg text-admin-danger'
      }`}
    >
      {positive ? '+' : ''}
      {value.toFixed(1)}
    </span>
  )
}

function SentimentBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string
  count: number
  total: number
  colorClass: string
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-admin-ink">{label}</span>
        <span className="text-admin-muted">{percent}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-admin-surfaceMuted">
        <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function ReviewStatsRow() {
  const [stats, setStats] = useState<ReviewStats | null>(null)

  useEffect(() => {
    let cancelled = false
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    const weekStart = startOfWeekMonday(today)

    Promise.all([
      fetchRatingCounts({}),
      fetchRatingCounts({ from: toDateStr(monthStart), to: toDateStr(today) }),
      fetchRatingCounts({ from: toDateStr(prevMonthStart), to: toDateStr(prevMonthEnd) }),
      ownerService.listReviews({ from: toDateStr(weekStart), to: toDateStr(today), limit: 1, offset: 0 }),
    ])
      .then(([allTime, thisMonth, lastMonth, weekly]) => {
        if (cancelled) return
        setStats({ allTime, thisMonth, lastMonth, newThisWeek: weekly.total })
      })
      .catch(() => {
        // Non-fatal — stats cards just stay empty if this fails; the list below still works.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const thisAvg = stats ? avgRatingOf(stats.thisMonth) : null
  const lastAvg = stats ? avgRatingOf(stats.lastMonth) : null
  const ratingDelta = thisAvg !== null && lastAvg !== null ? thisAvg - lastAvg : null
  const overallAvg = stats ? avgRatingOf(stats.allTime) : null

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-admin-border bg-white p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-admin-warningBg text-admin-warning">
          <Star size={18} />
        </span>
        <p className="mt-3 text-xs font-semibold text-admin-muted">AVERAGE RATING</p>
        <div className="mt-1 flex items-center">
          <p className="text-2xl font-bold text-admin-ink">{overallAvg !== null ? overallAvg.toFixed(1) : '—'}</p>
          <RatingDeltaBadge value={ratingDelta} />
        </div>
      </div>

      <div className="rounded-lg border border-admin-border bg-white p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-admin-infoBg text-admin-info">
          <MessageSquare size={18} />
        </span>
        <p className="mt-3 text-xs font-semibold text-admin-muted">TOTAL REVIEWS</p>
        <p className="mt-1 text-2xl font-bold text-admin-ink">{stats ? stats.allTime.total : '—'}</p>
        {stats && <p className="mt-2 text-xs text-admin-subtle">{stats.newThisWeek} new this week</p>}
      </div>

      <div className="rounded-lg border border-admin-border bg-white p-5">
        <p className="text-xs font-semibold text-admin-muted">SENTIMENT BREAKDOWN</p>
        {stats && stats.allTime.total > 0 ? (
          <div className="mt-4 space-y-3">
            <SentimentBar
              label="5 Stars"
              count={stats.allTime.counts[5] ?? 0}
              total={stats.allTime.total}
              colorClass="bg-admin-success"
            />
            <SentimentBar
              label="4 Stars"
              count={stats.allTime.counts[4] ?? 0}
              total={stats.allTime.total}
              colorClass="bg-admin-info"
            />
            <SentimentBar
              label="1-3 Stars"
              count={(stats.allTime.counts[1] ?? 0) + (stats.allTime.counts[2] ?? 0) + (stats.allTime.counts[3] ?? 0)}
              total={stats.allTime.total}
              colorClass="bg-admin-warning"
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-admin-muted">No reviews yet.</p>
        )}
      </div>
    </div>
  )
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<ReviewTab>('all')
  const [offset, setOffset] = useState(0)

  const [items, setItems] = useState<OwnerReviewListItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { toast, showToast, closeToast } = useToast()

  const fetchList = useCallback(() => {
    setIsLoading(true)
    setError(null)

    if (tab === '1to2stars') {
      // Backend GET /owner/reviews only accepts a single `rating` value, not a
      // range — merge two single-rating calls instead. Pagination (offset) is
      // not applied here as a result; this tab always shows its full result set.
      Promise.all([
        ownerService.listReviews({ rating: 1, limit: 50, offset: 0 }),
        ownerService.listReviews({ rating: 2, limit: 50, offset: 0 }),
      ])
        .then(([r1, r2]) => {
          const merged = [...r1.items, ...r2.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          setItems(merged)
          setTotal(merged.length)
        })
        .catch((err) => setError(getApiErrorMessage(err, 'Failed to load reviews.')))
        .finally(() => setIsLoading(false))
      return
    }

    const params = tab === 'needsReply' ? { hasReply: false } : tab === '5stars' ? { rating: 5 } : {}
    ownerService
      .listReviews({ ...params, limit: LIMIT, offset })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load reviews.')))
      .finally(() => setIsLoading(false))
  }, [tab, offset])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-admin-ink">Customer Reviews & Feedback</h1>
        <p className="text-sm text-admin-muted">View and respond to customer reviews</p>
      </div>

      <ReviewStatsRow />

      <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-admin-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setTab(t.value)
              setOffset(0)
            }}
            className={`border-b-2 pb-3 text-sm font-medium ${
              tab === t.value
                ? 'border-admin-primary text-admin-primary'
                : 'border-transparent text-admin-muted hover:text-admin-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-admin-border bg-white">
        {isLoading ? (
          <p className="p-6 text-sm text-admin-muted">Loading...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-admin-muted">No reviews found.</p>
        ) : (
          <ul>
            {items.map((row) => (
              <li key={row.reviewId} className="border-b border-admin-border last:border-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(row.reviewId)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-admin-surfaceMuted"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-admin-infoBg text-xs font-bold text-admin-info">
                    {initials(row.playerName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-admin-ink">{row.playerName ?? `User #${row.playerId}`}</p>
                      <Badge variant={row.hasReply ? 'success' : 'warning'}>
                        {row.hasReply ? 'Replied' : 'Needs Reply'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Stars rating={row.rating} />
                      <span className="text-admin-muted">· {row.venueName}</span>
                    </div>
                    {row.reviewText && (
                      <p className="line-clamp-2 text-sm text-admin-muted">{row.reviewText}</p>
                    )}
                    <p className="text-xs text-admin-subtle">{relativeDate(row.createdAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {tab !== '1to2stars' && (
          <Pagination total={total} limit={LIMIT} offset={offset} itemLabel="reviews" onOffsetChange={setOffset} />
        )}
      </div>

      {selectedId && (
        <ReviewDetailModal
          reviewId={selectedId}
          onClose={() => setSelectedId(null)}
          onReplied={() => {
            showToast('success', 'Reply sent.')
            fetchList()
          }}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

function ReviewDetailModal({
  reviewId,
  onClose,
  onReplied,
}: {
  reviewId: number
  onClose: () => void
  onReplied: () => void
}) {
  const [review, setReview] = useState<OwnerReviewDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    ownerService
      .getReview(reviewId)
      .then((res) => {
        if (!cancelled) setReview(res.review)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load review detail.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reviewId])

  const handleSubmitReply = () => {
    if (!replyText.trim()) return
    setIsSubmitting(true)
    setError(null)
    ownerService
      .replyToReview(reviewId, { replyText: replyText.trim() })
      .then((res) => {
        setReview((prev) =>
          prev
            ? {
                ...prev,
                reply: {
                  replyId: res.reply.replyId,
                  replyText: res.reply.replyText,
                  createdAt: res.reply.createdAt,
                },
              }
            : prev
        )
        onReplied()
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to send reply.')))
      .finally(() => setIsSubmitting(false))
  }

  return (
    <Modal title={review ? `Review #${review.reviewId}` : 'Review detail'} onClose={onClose}>
      {isLoading && <p className="text-sm text-admin-muted">Loading...</p>}
      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}
      {review && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-admin-infoBg text-sm font-bold text-admin-info">
              {initials(review.playerName)}
            </span>
            <div>
              <p className="font-semibold text-admin-ink">{review.playerName ?? `User #${review.playerId}`}</p>
              <div className="mt-1 flex items-center gap-2 text-sm text-admin-muted">
                <Stars rating={review.rating} />
                <span>· {review.venueName}</span>
              </div>
              <p className="mt-1 text-xs text-admin-subtle">
                {review.fieldName} · Booked on {relativeDate(review.bookingDate)} · Reviewed{' '}
                {relativeDate(review.createdAt)}
              </p>
            </div>
          </div>

          {review.reviewText && (
            <p className="rounded-md bg-admin-surfaceMuted px-4 py-3 text-sm text-admin-ink">
              {review.reviewText}
            </p>
          )}

          {review.reply ? (
            <div className="rounded-md border border-admin-border px-4 py-3">
              <p className="text-xs font-semibold text-admin-primary">OWNER RESPONSE</p>
              <p className="mt-1 text-sm text-admin-ink">{review.reply.replyText}</p>
              <p className="mt-1 text-xs text-admin-subtle">{relativeDate(review.reply.createdAt)}</p>
            </div>
          ) : (
            <div className="space-y-3 border-t border-admin-border pt-4">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply to this customer..."
                rows={3}
                className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyText.trim()}
                  className="rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-60"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
