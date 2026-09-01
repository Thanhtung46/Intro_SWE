import { useCallback, useEffect, useState } from 'react'
import { FacilityCard } from '../components/venues/FacilityCard'
import { FacilityForm } from '../components/venues/FacilityForm'
import { VenueForm } from '../components/venues/VenueForm'
import { EmptyState } from '../components/common/EmptyState'
import { deleteField, getRevenueSummary, getVenueDetail, patchField } from '../services/ownerApi'
import { useOwnerStore } from '../state/ownerStore'
import { formatVnd } from '../utils/format'
import iconRevenue from '../assets/owner/icon-revenue.svg'
import iconOccupancy from '../assets/owner/icon-occupancy.svg'
import iconPending from '../assets/owner/icon-pending.svg'
import iconPlus from '../assets/owner/icon-plus.svg'
import type { Field, VenueImage } from '../types/owner'

export function OwnerFacilitiesPage() {
  const { venue, loadVenue } = useOwnerStore()
  const [fields, setFields] = useState<Field[]>([])
  const [images, setImages] = useState<VenueImage[]>([])
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<Field | null | 'new'>(null)
  const [editingVenue, setEditingVenue] = useState(false)

  const reload = useCallback(async () => {
    if (!venue) return
    setLoading(true)
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const [detail, revenue] = await Promise.all([
        getVenueDetail(venue.venueId),
        getRevenueSummary({ from: today, to: today, venueId: venue.venueId }),
      ])
      setFields(detail.fields)
      setImages(detail.images)
      setTodayRevenue(revenue.totalRevenue)
      useOwnerStore.setState({ venue: detail.venue })
    } catch {
      setError('Could not load facilities.')
    } finally {
      setLoading(false)
    }
    // Depend on venueId, not the venue object — reload() itself replaces
    // that object in the store every run, so depending on the object
    // identity would recreate this callback every time and, combined with
    // the effect below, loop forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.venueId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function toggleMaintenance(field: Field) {
    if (!venue) return
    await patchField(venue.venueId, field.fieldId, {
      status: field.status === 'MAINTENANCE' ? 'ACTIVE' : 'MAINTENANCE',
    })
    void reload()
  }

  async function handleDelete(field: Field) {
    if (!venue) return
    const confirmed = window.confirm(
      `Delete "${field.name}"? It will stop appearing on the schedule and facility list. Its photos and booking history are kept, and it can be recovered by support if needed.`,
    )
    if (!confirmed) return
    await deleteField(venue.venueId, field.fieldId)
    void reload()
  }

  if (!venue) {
    return (
      <VenueForm
        venue={null}
        images={[]}
        onClose={() => {}}
        onSaved={() => void loadVenue()}
      />
    )
  }

  // Deleted fields are soft-deleted to INACTIVE (booking history references
  // field_id with ON DELETE RESTRICT, so a hard delete isn't possible once a
  // field has bookings) — hide them from the list instead of showing a
  // "deleted" court that still looks present.
  const visibleFields = fields.filter((f) => f.status !== 'INACTIVE')
  const activeCount = visibleFields.filter((f) => f.status === 'ACTIVE').length
  const maintenanceCount = visibleFields.filter((f) => f.status === 'MAINTENANCE').length
  const occupiedCount = visibleFields.filter((f) => f.status === 'ACTIVE' && !f.isAvailableNow).length
  const coverImageUrl = images[0]?.imageUrl

  return (
    <>
      <div className="owner-page-header">
        <div>
          <h1>Facility Management</h1>
          <p>
            {venue.name} · {venue.address}
            {!venue.latitude && ' · No map location set'}
            {images.length === 0 && ' · No photos yet'}
          </p>
        </div>
        <div className="owner-page-header__actions">
          <button className="owner-btn owner-btn--secondary" onClick={() => setEditingVenue(true)}>
            Edit Venue
          </button>
          <button className="owner-btn" onClick={() => setEditingField('new')}>
            <img src={iconPlus} alt="" width={13} style={{ filter: 'invert(1)' }} />
            Add Facility
          </button>
        </div>
      </div>

      <div className="owner-stats-row">
        <div className="owner-card owner-card--glass">
          <div className="owner-stat-top">
            <div className="owner-stat-icon" style={{ background: 'rgba(0,74,198,0.1)' }}>
              <img src={iconOccupancy} alt="" width={18} />
            </div>
          </div>
          <p className="owner-stat-label">Total Courts</p>
          <p className="owner-stat-value">{visibleFields.length} Units</p>
        </div>
        <div className="owner-card owner-card--glass">
          <div className="owner-stat-top">
            <div className="owner-stat-icon" style={{ background: '#dbe1ff' }}>
              <img src={iconOccupancy} alt="" width={18} />
            </div>
            <span className="owner-stat-pill" style={{ background: '#dbe1ff', color: '#004ac6' }}>
              {visibleFields.length ? Math.round((occupiedCount / visibleFields.length) * 100) : 0}% Capacity
            </span>
          </div>
          <p className="owner-stat-label">Daily Occupancy</p>
          <p className="owner-stat-value">
            {occupiedCount}/{activeCount} Active
          </p>
        </div>
        <div className="owner-card owner-card--glass">
          <div className="owner-stat-top">
            <div className="owner-stat-icon" style={{ background: '#ffddb8' }}>
              <img src={iconRevenue} alt="" width={18} />
            </div>
            <span className="owner-stat-pill" style={{ background: '#ffddb8', color: '#784b00' }}>
              Peak Hour
            </span>
          </div>
          <p className="owner-stat-label">Daily Revenue</p>
          <p className="owner-stat-value">{todayRevenue != null ? formatVnd(todayRevenue) : '—'}</p>
        </div>
        <div className="owner-card owner-card--glass">
          <div className="owner-stat-top">
            <div className="owner-stat-icon" style={{ background: '#ffdad6' }}>
              <img src={iconPending} alt="" width={18} />
            </div>
            {maintenanceCount > 0 && (
              <span className="owner-stat-pill" style={{ background: '#ffdad6', color: '#ba1a1a' }}>
                Alert
              </span>
            )}
          </div>
          <p className="owner-stat-label">Maintenance</p>
          <p className="owner-stat-value">{maintenanceCount} Due Today</p>
        </div>
      </div>

      {error && <p className="owner-error-text">{error}</p>}

      {loading && visibleFields.length === 0 ? (
        <p>Loading facilities…</p>
      ) : visibleFields.length === 0 ? (
        <EmptyState title="No facilities yet" description="Add your first court or pitch." />
      ) : (
        <div className="owner-facility-grid">
          {visibleFields.map((field) => (
            <FacilityCard
              key={field.fieldId}
              field={field}
              coverImageUrl={coverImageUrl}
              onEdit={setEditingField}
              onToggleMaintenance={toggleMaintenance}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {editingField && (
        <FacilityForm
          venueId={venue.venueId}
          field={editingField === 'new' ? null : editingField}
          onClose={() => setEditingField(null)}
          onSaved={() => {
            setEditingField(null)
            void reload()
          }}
        />
      )}

      {editingVenue && (
        <VenueForm
          venue={venue}
          images={images}
          onClose={() => setEditingVenue(false)}
          onSaved={() => {
            setEditingVenue(false)
            void reload()
          }}
        />
      )}
    </>
  )
}
