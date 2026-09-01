import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { FacilityCard } from '../components/venues/FacilityCard'
import { FacilityForm } from '../components/venues/FacilityForm'
import { EmptyState } from '../components/common/EmptyState'
import { createVenue, getVenueDetail, patchField } from '../services/ownerApi'
import { useOwnerStore } from '../state/ownerStore'
import type { Field } from '../types/owner'

function CreateVenueForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createVenue({ name, address, openingHours: '06:00', closingHours: '23:00' })
      onCreated()
    } catch {
      setError('Could not create the venue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="owner-card" style={{ maxWidth: 420 }}>
      <h3 style={{ marginTop: 0 }}>Create your venue</h3>
      <form onSubmit={handleSubmit}>
        <div className="owner-field">
          <label htmlFor="vname">Venue name</label>
          <input id="vname" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="owner-field">
          <label htmlFor="vaddress">Address</label>
          <input id="vaddress" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
        {error && <p className="owner-error-text">{error}</p>}
        <button className="owner-btn" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create venue'}
        </button>
      </form>
    </div>
  )
}

export function OwnerFacilitiesPage() {
  const { venue, loadVenue } = useOwnerStore()
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Field | null | 'new'>(null)

  const reload = useCallback(async () => {
    if (!venue) return
    setLoading(true)
    setError(null)
    try {
      const detail = await getVenueDetail(venue.venueId)
      setFields(detail.fields)
    } catch {
      setError('Could not load facilities.')
    } finally {
      setLoading(false)
    }
  }, [venue])

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

  if (!venue) {
    return (
      <CreateVenueForm onCreated={() => void loadVenue()} />
    )
  }

  return (
    <div>
      <div className="owner-page-header">
        <div>
          <h1>Facilities</h1>
          <p>{venue.name}</p>
        </div>
        <button className="owner-btn" onClick={() => setEditing('new')}>
          Add facility
        </button>
      </div>

      {loading && <p>Loading facilities…</p>}
      {error && <p className="owner-error-text">{error}</p>}
      {!loading && fields.length === 0 && (
        <EmptyState title="No facilities yet" description="Add your first court or pitch." />
      )}

      <div className="owner-facility-grid">
        {fields.map((field) => (
          <FacilityCard
            key={field.fieldId}
            field={field}
            onEdit={setEditing}
            onToggleMaintenance={toggleMaintenance}
          />
        ))}
      </div>

      {editing && (
        <FacilityForm
          venueId={venue.venueId}
          field={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}
