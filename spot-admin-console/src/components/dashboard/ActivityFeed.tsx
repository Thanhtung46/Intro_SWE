import { EmptyState } from '../common/EmptyState'
import iconBooking from '../../assets/owner/icon-activity-booking.svg'
import iconCheck from '../../assets/owner/icon-activity-check.svg'
import iconReview from '../../assets/owner/icon-activity-review.svg'
import type { ActivityEvent } from '../../types/owner'

function formatWhen(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.round(diffMs / 60000))
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('vi-VN')
}

function iconFor(activity: ActivityEvent) {
  if (activity.type === 'REVIEW_CREATED') return iconReview
  if (activity.status === 'COMPLETED') return iconCheck
  return iconBooking
}

interface ActivityFeedProps {
  activities: ActivityEvent[]
  canViewMore: boolean
  onViewAll: () => void
}

export function ActivityFeed({ activities, canViewMore, onViewAll }: ActivityFeedProps) {
  return (
    <div className="owner-panel">
      <div className="owner-panel__header">
        <h2 className="owner-panel__title" style={{ fontSize: 18 }}>
          Recent Activities
        </h2>
        {canViewMore && (
          <button className="owner-panel__link" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activities.length === 0 ? (
          <EmptyState title="No recent activity" />
        ) : (
          activities.map((activity) => (
            <div className="owner-activity-item" key={`${activity.type}-${activity.referenceId}`}>
              <div className="owner-activity-item__icon">
                <img src={iconFor(activity)} alt="" />
              </div>
              <div>
                <p className="owner-activity-item__title">{activity.title}</p>
                <p className="owner-activity-item__desc">{activity.venueName}</p>
                <p className="owner-activity-item__time">{formatWhen(activity.occurredAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
