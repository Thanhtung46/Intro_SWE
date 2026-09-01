import iconRevenue from '../../assets/owner/icon-revenue.svg'
import iconOccupancy from '../../assets/owner/icon-occupancy.svg'
import iconPending from '../../assets/owner/icon-pending.svg'
import iconStar from '../../assets/owner/icon-star.svg'

const ICONS = {
  revenue: iconRevenue,
  occupancy: iconOccupancy,
  pending: iconPending,
  reviews: iconStar,
} as const

interface KpiCardProps {
  icon: keyof typeof ICONS
  label: string
  value: string
  badge?: { text: string; tone?: 'green' | 'red' }
  hint?: string
}

export function KpiCard({ icon, label, value, badge, hint }: KpiCardProps) {
  return (
    <div className="owner-card owner-kpi-card">
      <div className="owner-kpi-card__top">
        <div className="owner-kpi-card__icon">
          <img src={ICONS[icon]} alt="" width={22} />
        </div>
        {badge && (
          <span
            className={
              badge.tone === 'red'
                ? 'owner-kpi-card__badge owner-kpi-card__badge--red'
                : 'owner-kpi-card__badge'
            }
          >
            {badge.text}
          </span>
        )}
      </div>
      <div>
        <p className="owner-kpi-card__label">{label}</p>
        <p className="owner-kpi-card__value">{value}</p>
        {hint && <p className="owner-kpi-card__hint">{hint}</p>}
      </div>
    </div>
  )
}
