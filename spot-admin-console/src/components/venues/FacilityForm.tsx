import { useState, type FormEvent } from 'react'
import { createField, patchField } from '../../services/ownerApi'
import type { Field, SportType } from '../../types/owner'

interface FacilityFormProps {
  venueId: number
  field: Field | null
  onClose: () => void
  onSaved: () => void
}

export function FacilityForm({ venueId, field, onClose, onSaved }: FacilityFormProps) {
  const [name, setName] = useState(field?.name ?? '')
  const [sportType, setSportType] = useState<SportType>(field?.sportType ?? 'Badminton')
  const [pricePerHour, setPricePerHour] = useState(String(field?.pricePerHour ?? ''))
  const [peakPricePerHour, setPeakPricePerHour] = useState(String(field?.peakPricePerHour ?? ''))
  const [offPeakPricePerHour, setOffPeakPricePerHour] = useState(
    String(field?.offPeakPricePerHour ?? ''),
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (field) {
        await patchField(venueId, field.fieldId, {
          name,
          pricePerHour: Number(pricePerHour),
          peakPricePerHour: Number(peakPricePerHour),
          offPeakPricePerHour: Number(offPeakPricePerHour),
        })
      } else {
        await createField(venueId, {
          name,
          sportType,
          pricePerHour: Number(pricePerHour),
          peakPricePerHour: Number(peakPricePerHour) || undefined,
          offPeakPricePerHour: Number(offPeakPricePerHour) || undefined,
        })
      }
      onSaved()
    } catch {
      setError('Could not save the facility.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="owner-modal-backdrop" onClick={onClose}>
      <div className="owner-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{field ? 'Edit facility' : 'Add facility'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="owner-field">
            <label htmlFor="fname">Name</label>
            <input id="fname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {!field && (
            <div className="owner-field">
              <label htmlFor="sport">Sport</label>
              <select id="sport" value={sportType} onChange={(e) => setSportType(e.target.value as SportType)}>
                <option value="Badminton">Badminton</option>
                <option value="Football">Football</option>
              </select>
            </div>
          )}
          <div className="owner-field">
            <label htmlFor="price">Base price / hour (VND)</label>
            <input
              id="price"
              type="number"
              min={0}
              value={pricePerHour}
              onChange={(e) => setPricePerHour(e.target.value)}
              required
            />
          </div>
          <div className="owner-field">
            <label htmlFor="peak">Peak price / hour (VND)</label>
            <input
              id="peak"
              type="number"
              min={0}
              value={peakPricePerHour}
              onChange={(e) => setPeakPricePerHour(e.target.value)}
            />
          </div>
          <div className="owner-field">
            <label htmlFor="offpeak">Off-peak price / hour (VND)</label>
            <input
              id="offpeak"
              type="number"
              min={0}
              value={offPeakPricePerHour}
              onChange={(e) => setOffPeakPricePerHour(e.target.value)}
            />
          </div>
          {error && <p className="owner-error-text">{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="owner-btn" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button className="owner-btn owner-btn--secondary" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
