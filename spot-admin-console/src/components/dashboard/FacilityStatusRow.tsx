import type { FacilityCard } from '../../types/owner'

export function FacilityStatusRow({ facilities }: { facilities: FacilityCard[] }) {
  if (facilities.length === 0) return null
  return (
    <div className="owner-card" style={{ marginTop: 16 }}>
      <p className="owner-kpi-card__label" style={{ marginBottom: 8 }}>
        Facility status
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {facilities.map((facility) => (
          <span
            key={facility.fieldId}
            className={`owner-facility-card__badge owner-facility-card__badge--${facility.status}`}
          >
            {facility.fieldName} · {facility.status === 'ACTIVE' ? (facility.isAvailableNow ? 'Free now' : 'In use') : facility.status}
          </span>
        ))}
      </div>
    </div>
  )
}
