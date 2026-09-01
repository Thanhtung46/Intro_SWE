import { useNavigate } from 'react-router-dom'
import type { FacilityCard } from '../../types/owner'

export function FacilityStatusRow({ facilities }: { facilities: FacilityCard[] }) {
  const navigate = useNavigate()
  if (facilities.length === 0) return null

  return (
    <div>
      <h2 className="owner-section-title" style={{ marginBottom: 24 }}>
        Facility Status
      </h2>
      <div className="owner-facility-mini-row">
        {facilities.map((facility) => (
          <div className="owner-facility-mini" key={facility.fieldId}>
            <div className="owner-facility-mini__image" />
            <div className="owner-facility-mini__body">
              <p className="owner-facility-mini__title">{facility.fieldName}</p>
              <div className="owner-facility-mini__status">
                <span
                  className={
                    facility.status === 'ACTIVE'
                      ? 'owner-facility-mini__dot'
                      : 'owner-facility-mini__dot owner-facility-mini__dot--amber'
                  }
                />
                {facility.status === 'ACTIVE'
                  ? facility.isAvailableNow
                    ? 'Available now'
                    : 'In use'
                  : facility.status === 'MAINTENANCE'
                    ? 'Maintenance due'
                    : 'Inactive'}
              </div>
              <button
                className="owner-facility-mini__manage"
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                onClick={() => navigate('/owner/facilities')}
              >
                Manage &gt;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
