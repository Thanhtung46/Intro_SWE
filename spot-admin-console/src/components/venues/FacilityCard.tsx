import { formatVnd } from '../../utils/format'
import type { Field } from '../../types/owner'

const FOOTBALL_VARIANT_LABEL: Record<string, string> = {
  FIVE_A_SIDE: 'Sân 5',
  SEVEN_A_SIDE: 'Sân 7',
}

interface FacilityCardProps {
  field: Field
  coverImageUrl?: string
  onEdit: (field: Field) => void
  onToggleMaintenance: (field: Field) => void
  onDelete: (field: Field) => void
}

export function FacilityCard({
  field,
  coverImageUrl,
  onEdit,
  onToggleMaintenance,
  onDelete,
}: FacilityCardProps) {
  const fieldCover = field.images[0]?.imageUrl ?? coverImageUrl

  return (
    <div className="owner-facility-card">
      <div
        className="owner-facility-card__cover"
        style={
          fieldCover
            ? { backgroundImage: `url(${fieldCover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        <span className={`owner-facility-card__badge owner-facility-card__badge--${field.status}`}>
          <span className="owner-facility-card__badge-dot" />
          {field.status}
        </span>
        {field.images.length > 1 && (
          <span
            style={{
              position: 'absolute',
              bottom: 12,
              right: 16,
              background: 'rgba(15,23,42,0.6)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 9999,
            }}
          >
            {field.images.length} photos
          </span>
        )}
      </div>
      <div className="owner-facility-card__body">
        <div>
          <h3 className="owner-facility-card__title">{field.name}</h3>
          <p className="owner-facility-card__sub">
            {field.sportType}
            {field.footballVariant && ` · ${FOOTBALL_VARIANT_LABEL[field.footballVariant]}`}
          </p>
        </div>

        <div className="owner-facility-card__pricing">
          <div className="owner-facility-card__price-col">
            <div className="owner-facility-card__price-label">Off-Peak</div>
            <span className="owner-facility-card__price-value">
              {formatVnd(field.offPeakPricePerHour)}
            </span>
            <span className="owner-facility-card__price-unit">/hr</span>
          </div>
          <div className="owner-facility-card__price-col">
            <div className="owner-facility-card__price-label owner-facility-card__price-label--peak">
              Peak Hour
            </div>
            <span className="owner-facility-card__price-value owner-facility-card__price-value--peak">
              {formatVnd(field.peakPricePerHour)}
            </span>
            <span className="owner-facility-card__price-unit">/hr</span>
          </div>
        </div>

        <div className="owner-facility-card__actions">
          <button className="owner-btn owner-btn--outline-blue owner-btn--block" onClick={() => onEdit(field)}>
            Edit
          </button>
          <button className="owner-btn owner-btn--block" onClick={() => onToggleMaintenance(field)}>
            {field.status === 'MAINTENANCE' ? 'Set Active' : 'Mark Maintenance'}
          </button>
        </div>
        <button
          onClick={() => onDelete(field)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ba1a1a',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginTop: 12,
          }}
        >
          Delete facility
        </button>
      </div>
    </div>
  )
}
