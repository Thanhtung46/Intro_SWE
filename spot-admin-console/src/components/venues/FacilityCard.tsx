import { formatVnd } from '../../utils/format'
import type { Field } from '../../types/owner'

interface FacilityCardProps {
  field: Field
  onEdit: (field: Field) => void
  onToggleMaintenance: (field: Field) => void
}

export function FacilityCard({ field, onEdit, onToggleMaintenance }: FacilityCardProps) {
  return (
    <div className="owner-card">
      <span className={`owner-facility-card__badge owner-facility-card__badge--${field.status}`}>
        {field.status}
      </span>
      <h3 style={{ margin: '4px 0' }}>{field.name}</h3>
      <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{field.sportType}</p>
      <div className="owner-facility-card__pricing">
        <span>Peak: {formatVnd(field.peakPricePerHour)}</span>
        <span>Off-peak: {formatVnd(field.offPeakPricePerHour)}</span>
      </div>
      <div className="owner-facility-card__actions">
        <button className="owner-btn owner-btn--secondary" onClick={() => onEdit(field)}>
          Edit
        </button>
        <button className="owner-btn owner-btn--secondary" onClick={() => onToggleMaintenance(field)}>
          {field.status === 'MAINTENANCE' ? 'Set active' : 'Mark maintenance'}
        </button>
      </div>
    </div>
  )
}
