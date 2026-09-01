import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createVenue, patchVenue, replaceVenueImages, uploadFacilityImages } from '../../services/ownerApi'
import type { Venue, VenueImage } from '../../types/owner'

interface VenueFormProps {
  venue: Venue | null
  images: VenueImage[]
  onClose: () => void
  onSaved: () => void
}

export function VenueForm({ venue, images, onClose, onSaved }: VenueFormProps) {
  const [name, setName] = useState(venue?.name ?? '')
  const [address, setAddress] = useState(venue?.address ?? '')
  const [amenities, setAmenities] = useState(venue?.amenities ?? '')
  const [latitude, setLatitude] = useState(venue?.latitude != null ? String(venue.latitude) : '')
  const [longitude, setLongitude] = useState(venue?.longitude != null ? String(venue.longitude) : '')
  const [imageUrls, setImageUrls] = useState<string[]>(images.map((i) => i.imageUrl))
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      const payload = {
        name,
        address,
        amenities: amenities || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
      }

      const venueId = venue
        ? (await patchVenue(venue.venueId, payload)).venueId
        : (await createVenue({ ...payload, openingHours: '06:00', closingHours: '23:00' })).venueId

      const cleanUrls = imageUrls.map((u) => u.trim()).filter(Boolean)
      if (cleanUrls.length > 0) {
        await replaceVenueImages(
          venueId,
          cleanUrls.map((imageUrl, displayOrder) => ({ imageUrl, displayOrder })),
        )
      }

      onSaved()
    } catch {
      setError('Could not save the venue.')
    } finally {
      setSubmitting(false)
    }
  }

  const formBody = (
    <form onSubmit={handleSubmit}>
      <div className="owner-field">
        <label htmlFor="vname">Venue name</label>
        <input id="vname" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="owner-field">
        <label htmlFor="vaddress">Address</label>
        <input id="vaddress" value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>
      <div className="owner-field">
        <label htmlFor="vamenities">Amenities (optional)</label>
        <input
          id="vamenities"
          placeholder="Parking, Shower, Locker room..."
          value={amenities ?? ''}
          onChange={(e) => setAmenities(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="owner-field" style={{ flex: 1 }}>
          <label htmlFor="vlat">Latitude</label>
          <input
            id="vlat"
            type="number"
            step="any"
            min={-90}
            max={90}
            placeholder="e.g. 10.7769"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
        </div>
        <div className="owner-field" style={{ flex: 1 }}>
          <label htmlFor="vlong">Longitude</label>
          <input
            id="vlong"
            type="number"
            step="any"
            min={-180}
            max={180}
            placeholder="e.g. 106.7009"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--owner-text-muted)', marginTop: -4 }}>
        Optional, but players can't see distance-to-venue without it. Find these on Google
        Maps: right-click the venue's pin → tap the coordinates to copy.
      </p>

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
          JPEG/PNG/WebP/GIF, max 2MB each.
        </p>
      </div>

      {error && <p className="owner-error-text">{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="owner-btn" type="submit" disabled={submitting || uploading}>
          {submitting ? 'Saving…' : venue ? 'Save changes' : 'Create venue'}
        </button>
        {venue && (
          <button type="button" className="owner-btn owner-btn--secondary" onClick={onClose}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )

  if (!venue) {
    return (
      <div className="owner-card" style={{ maxWidth: 420 }}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>Create your venue</h3>
        {formBody}
      </div>
    )
  }

  return (
    <div className="owner-modal-backdrop" onClick={onClose}>
      <div className="owner-modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Edit venue</h3>
        {formBody}
      </div>
    </div>
  )
}
