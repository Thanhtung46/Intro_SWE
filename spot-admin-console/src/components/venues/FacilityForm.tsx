import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createField, patchField, replaceFieldImages, uploadFacilityImages } from '../../services/ownerApi'
import type { Field, FootballVariant, SportType } from '../../types/owner'

interface FacilityFormProps {
  venueId: number
  field: Field | null
  onClose: () => void
  onSaved: () => void
}

export function FacilityForm({ venueId, field, onClose, onSaved }: FacilityFormProps) {
  const [name, setName] = useState(field?.name ?? '')
  const [sportType, setSportType] = useState<SportType>(field?.sportType ?? 'Badminton')
  const [footballVariant, setFootballVariant] = useState<FootballVariant>(
    field?.footballVariant ?? 'FIVE_A_SIDE',
  )
  const [pricePerHour, setPricePerHour] = useState(String(field?.pricePerHour ?? ''))
  const [peakPricePerHour, setPeakPricePerHour] = useState(String(field?.peakPricePerHour ?? ''))
  const [offPeakPricePerHour, setOffPeakPricePerHour] = useState(
    String(field?.offPeakPricePerHour ?? ''),
  )
  const [imageUrls, setImageUrls] = useState<string[]>(
    field ? field.images.map((i) => i.imageUrl) : [],
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function removeImageAt(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    setError(null)
    try {
      const urls = await uploadFacilityImages(files)
      setImageUrls((prev) => [...prev, ...urls])
    } catch {
      setError('Could not upload photos. Use JPEG/PNG/WebP/GIF, max 2MB each.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const fieldId = field
        ? (
            await patchField(venueId, field.fieldId, {
              name,
              pricePerHour: Number(pricePerHour),
              peakPricePerHour: Number(peakPricePerHour),
              offPeakPricePerHour: Number(offPeakPricePerHour),
            })
          ).fieldId
        : (
            await createField(venueId, {
              name,
              sportType,
              footballVariant: sportType === 'Football' ? footballVariant : undefined,
              pricePerHour: Number(pricePerHour),
              peakPricePerHour: Number(peakPricePerHour) || undefined,
              offPeakPricePerHour: Number(offPeakPricePerHour) || undefined,
            })
          ).fieldId

      const cleanUrls = imageUrls.map((u) => u.trim()).filter(Boolean)
      if (cleanUrls.length > 0) {
        await replaceFieldImages(
          venueId,
          fieldId,
          cleanUrls.map((imageUrl, displayOrder) => ({ imageUrl, displayOrder })),
        )
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
      <div className="owner-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
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
          {!field && sportType === 'Football' && (
            <div className="owner-field">
              <label htmlFor="footballVariant">Court size</label>
              <select
                id="footballVariant"
                value={footballVariant}
                onChange={(e) => setFootballVariant(e.target.value as FootballVariant)}
              >
                <option value="FIVE_A_SIDE">Sân 5 (5-a-side)</option>
                <option value="SEVEN_A_SIDE">Sân 7 (7-a-side)</option>
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

          <div className="owner-field">
            <label>Photos</label>
            {imageUrls.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {imageUrls.map((url, i) => (
                  <div key={url} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt=""
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageAt(i)}
                      aria-label="Remove photo"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#0f172a',
                        color: '#fff',
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFilesSelected}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="owner-btn owner-btn--secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : '+ Upload photos'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--owner-text-muted)', marginTop: 8 }}>
              Players will see these when choosing this court. JPEG/PNG/WebP/GIF, max 2MB each.
            </p>
          </div>

          {error && <p className="owner-error-text">{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="owner-btn" type="submit" disabled={submitting || uploading}>
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
