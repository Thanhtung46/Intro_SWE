import { EmptyState } from '../common/EmptyState'
import type { ActivityEvent } from '../../types/owner'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function ActivityFeed({ activities }: { activities: ActivityEvent[] }) {
  return (
    <div className="owner-card">
      <p className="owner-kpi-card__label" style={{ marginBottom: 8 }}>
        Recent activity
      </p>
      {activities.length === 0 ? (
        <EmptyState title="No recent activity" />
      ) : (
        activities.map((activity) => (
          <div className="owner-activity-item" key={`${activity.type}-${activity.referenceId}`}>
            <span>{activity.title}</span>
            <span className="owner-activity-item__meta">{formatWhen(activity.occurredAt)}</span>
          </div>
        ))
      )}
    </div>
  )
}
