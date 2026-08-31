'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUp, ArrowDown, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import * as ownerService from '@/services/owner.service'
import type {
  CreateFieldPayload,
  FieldStatus,
  OwnerField,
  OwnerVenueDetail,
  OwnerVenueImage,
  PatchFieldPayload,
  PatchVenuePayload,
  SportType,
  VenueImageInput,
} from '@/types/owner'
import Modal from '@/components/admin/Modal'
import Toast from '@/components/admin/Toast'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import Badge, { BadgeVariant } from '@/components/admin/Badge'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatCurrency } from '@/utils/formatCurrency'

const SPORT_OPTIONS: SportType[] = ['Football', 'Badminton']
const STATUS_OPTIONS: FieldStatus[] = ['ACTIVE', 'MAINTENANCE', 'INACTIVE']

function statusBadgeVariant(status: FieldStatus): BadgeVariant {
  if (status === 'ACTIVE') return 'success'
  if (status === 'MAINTENANCE') return 'warning'
  return 'neutral'
}

export default function VenueDetailPage() {
  const params = useParams<{ venueId: string }>()
  const router = useRouter()
  const venueId = Number(params.venueId)

  const [venue, setVenue] = useState<OwnerVenueDetail | null>(null)
  const [fields, setFields] = useState<OwnerField[]>([])
  const [images, setImages] = useState<OwnerVenueImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fieldModal, setFieldModal] = useState<{ mode: 'create' } | { mode: 'edit'; field: OwnerField } | null>(
    null
  )
  const [deactivateTarget, setDeactivateTarget] = useState<OwnerField | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)

  const { toast, showToast, closeToast } = useToast()

  const fetchVenue = useCallback(() => {
    setIsLoading(true)
    setError(null)
    ownerService
      .getVenue(venueId)
      .then((res) => {
        setVenue(res.venue)
        setFields(res.fields)
        setImages(res.images)
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load facility.')))
      .finally(() => setIsLoading(false))
  }, [venueId])

  useEffect(() => {
    fetchVenue()
  }, [fetchVenue])

  const handleDeactivateField = () => {
    if (!deactivateTarget) return
    setIsDeactivating(true)
    ownerService
      .deleteField(venueId, deactivateTarget.fieldId)
      .then(() => {
        showToast('success', `${deactivateTarget.name} has been deactivated.`)
        setDeactivateTarget(null)
        fetchVenue()
      })
      .catch((err) => showToast('error', getApiErrorMessage(err, 'Failed to deactivate court.')))
      .finally(() => setIsDeactivating(false))
  }

  if (isLoading) {
    return <p className="text-sm text-admin-muted">Loading...</p>
  }

  if (error || !venue) {
    return (
      <div>
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">
          {error ?? 'Facility not found.'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/owner/facilities')}
          className="text-sm font-medium text-admin-primary hover:underline"
        >
          &larr; Back to Facilities
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/owner/facilities')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-admin-muted hover:text-admin-ink"
      >
        <ArrowLeft size={16} />
        Back to Facilities
      </button>

      <VenueInfoCard venue={venue} onSaved={fetchVenue} />

      <div className="mt-6 rounded-lg border border-admin-border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-admin-ink">Courts</h2>
          <button
            type="button"
            onClick={() => setFieldModal({ mode: 'create' })}
            className="flex items-center gap-1.5 rounded-md bg-admin-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-admin-primaryHover"
          >
            <Plus size={15} />
            Add Court
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-admin-muted">No courts yet. Add your first court above.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.fieldId} className="rounded-lg border border-admin-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-admin-ink">{field.name}</p>
                    <p className="text-xs text-admin-muted">
                      {field.sportType} · Capacity {field.capacity}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(field.status)}>{field.status}</Badge>
                </div>

                <div className="mt-3 flex divide-x divide-admin-border rounded-md bg-admin-surfaceMuted text-xs">
                  <div className="flex-1 px-3 py-2">
                    <p className="font-bold text-admin-muted">OFF-PEAK</p>
                    <p className="mt-1 text-sm font-bold text-admin-ink">
                      {formatCurrency(field.offPeakPricePerHour, 'VND')}
                      <span className="font-normal text-admin-muted">/hr</span>
                    </p>
                  </div>
                  <div className="flex-1 px-3 py-2">
                    <p className="font-bold text-admin-primary">PEAK HOUR</p>
                    <p className="mt-1 text-sm font-bold text-admin-primary">
                      {formatCurrency(field.peakPricePerHour, 'VND')}
                      <span className="font-normal text-admin-muted">/hr</span>
                    </p>
                  </div>
                </div>

                {field.maintenanceNote && (
                  <p className="mt-2 text-xs text-admin-subtle">Note: {field.maintenanceNote}</p>
                )}
                <p className="mt-2 text-xs text-admin-muted">
                  {field.isAvailableNow ? 'Available now' : 'Not available now'}
                </p>

                <div className="mt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setFieldModal({ mode: 'edit', field })}
                    className="flex items-center gap-1 text-sm font-medium text-admin-primary hover:underline"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  {field.status !== 'INACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setDeactivateTarget(field)}
                      className="flex items-center gap-1 text-sm font-medium text-admin-danger hover:underline"
                    >
                      <Trash2 size={13} />
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <VenueImagesCard venueId={venueId} initialImages={images} onSaved={fetchVenue} />

      {fieldModal && (
        <FieldFormModal
          venueId={venueId}
          mode={fieldModal.mode}
          field={fieldModal.mode === 'edit' ? fieldModal.field : undefined}
          onClose={() => setFieldModal(null)}
          onSaved={() => {
            setFieldModal(null)
            showToast('success', fieldModal.mode === 'create' ? 'Court created.' : 'Court updated.')
            fetchVenue()
          }}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Deactivate court?"
          message={`This marks "${deactivateTarget.name}" as INACTIVE. It will no longer be bookable, but its data is kept — this does not permanently delete it.`}
          confirmLabel="Deactivate"
          danger
          isSubmitting={isDeactivating}
          onConfirm={handleDeactivateField}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

function VenueInfoCard({ venue, onSaved }: { venue: OwnerVenueDetail; onSaved: () => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    name: venue.name,
    address: venue.address,
    amenities: venue.amenities ?? '',
    openingHours: venue.openingHours ?? '',
    closingHours: venue.closingHours ?? '',
    latitude: venue.latitude,
    longitude: venue.longitude,
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setForm({
      name: venue.name,
      address: venue.address,
      amenities: venue.amenities ?? '',
      openingHours: venue.openingHours ?? '',
      closingHours: venue.closingHours ?? '',
      latitude: venue.latitude,
      longitude: venue.longitude,
    })
  }, [venue])

  const handleSave = () => {
    const diff: PatchVenuePayload = {}
    if (form.name.trim() !== venue.name) diff.name = form.name.trim()
    if (form.address.trim() !== venue.address) diff.address = form.address.trim()
    if (form.amenities.trim() !== (venue.amenities ?? '')) diff.amenities = form.amenities.trim() || null
    if (form.openingHours !== (venue.openingHours ?? '')) diff.openingHours = form.openingHours || null
    if (form.closingHours !== (venue.closingHours ?? '')) diff.closingHours = form.closingHours || null
    if (form.latitude !== venue.latitude) diff.latitude = form.latitude
    if (form.longitude !== venue.longitude) diff.longitude = form.longitude

    if (Object.keys(diff).length === 0) {
      setIsEditing(false)
      return
    }

    setError(null)
    setIsSubmitting(true)
    ownerService
      .patchVenue(venue.venueId, diff)
      .then(() => {
        setIsEditing(false)
        onSaved()
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to update facility.')))
      .finally(() => setIsSubmitting(false))
  }

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-admin-border bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-admin-ink">{venue.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-admin-muted">
              <MapPin size={14} />
              {venue.address}
            </p>
            {venue.amenities && <p className="mt-2 text-sm text-admin-muted">{venue.amenities}</p>}
            <p className="mt-2 text-xs text-admin-subtle">
              {venue.openingHours ?? '—'} – {venue.closingHours ?? '—'}
            </p>
            <p className="mt-2 flex items-center gap-1 text-sm">
              {venue.ratingCount > 0 ? (
                <>
                  <Star size={14} className="fill-amber-500 text-amber-500" />
                  <span className="font-medium text-admin-ink">{venue.avgRating.toFixed(1)}</span>
                  <span className="text-admin-muted">({venue.ratingCount} reviews)</span>
                </>
              ) : (
                <span className="text-admin-muted">No ratings yet</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 rounded-md border border-admin-border px-3 py-1.5 text-sm font-medium text-admin-ink hover:bg-admin-surfaceMuted"
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-admin-border bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold text-admin-ink">Edit Facility</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Amenities</label>
          <textarea
            value={form.amenities}
            onChange={(e) => setForm({ ...form, amenities: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Opening hours</label>
            <input
              type="time"
              value={form.openingHours}
              onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Closing hours</label>
            <input
              type="time"
              value={form.closingHours}
              onChange={(e) => setForm({ ...form, closingHours: e.target.value })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Latitude</label>
            <input
              type="number"
              step="any"
              value={form.latitude ?? ''}
              onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Longitude</label>
            <input
              type="number"
              step="any"
              value={form.longitude ?? ''}
              onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-admin-dangerBg px-3 py-2 text-sm text-admin-danger">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setError(null)
            }}
            disabled={isSubmitting}
            className="rounded-md border border-admin-border px-4 py-2 text-sm font-medium text-admin-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldFormModal({
  venueId,
  mode,
  field,
  onClose,
  onSaved,
}: {
  venueId: number
  mode: 'create' | 'edit'
  field?: OwnerField
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: field?.name ?? '',
    sportType: (field?.sportType as SportType) ?? SPORT_OPTIONS[0],
    capacity: field?.capacity ?? 10,
    status: field?.status ?? 'ACTIVE',
    maintenanceNote: field?.maintenanceNote ?? '',
    pricePerHour: field?.pricePerHour ?? 0,
    peakPricePerHour: field?.peakPricePerHour ?? 0,
    offPeakPricePerHour: field?.offPeakPricePerHour ?? 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || form.pricePerHour <= 0) {
      setError('Name and a positive price per hour are required.')
      return
    }
    setError(null)
    setIsSubmitting(true)

    if (mode === 'create') {
      const payload: CreateFieldPayload = {
        name: form.name.trim(),
        sportType: form.sportType,
        capacity: form.capacity,
        status: form.status,
        maintenanceNote: form.maintenanceNote.trim() || undefined,
        pricePerHour: form.pricePerHour,
        peakPricePerHour: form.peakPricePerHour || undefined,
        offPeakPricePerHour: form.offPeakPricePerHour || undefined,
      }
      ownerService
        .createField(venueId, payload)
        .then(() => onSaved())
        .catch((err) => setError(getApiErrorMessage(err, 'Failed to create court.')))
        .finally(() => setIsSubmitting(false))
      return
    }

    if (!field) return
    const diff: PatchFieldPayload = {}
    if (form.name.trim() !== field.name) diff.name = form.name.trim()
    if (form.sportType !== field.sportType) diff.sportType = form.sportType
    if (form.capacity !== field.capacity) diff.capacity = form.capacity
    if (form.status !== field.status) diff.status = form.status
    if (form.maintenanceNote.trim() !== (field.maintenanceNote ?? '')) {
      diff.maintenanceNote = form.maintenanceNote.trim() || null
    }
    if (form.pricePerHour !== field.pricePerHour) diff.pricePerHour = form.pricePerHour
    if (form.peakPricePerHour !== field.peakPricePerHour) diff.peakPricePerHour = form.peakPricePerHour
    if (form.offPeakPricePerHour !== field.offPeakPricePerHour) {
      diff.offPeakPricePerHour = form.offPeakPricePerHour
    }

    if (Object.keys(diff).length === 0) {
      onClose()
      return
    }

    ownerService
      .patchField(venueId, field.fieldId, diff)
      .then(() => onSaved())
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to update court.')))
      .finally(() => setIsSubmitting(false))
  }

  return (
    <Modal title={mode === 'create' ? 'Add Court' : `Edit ${field?.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Sport</label>
            <select
              value={form.sportType}
              onChange={(e) => setForm({ ...form, sportType: e.target.value as SportType })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            >
              {SPORT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as FieldStatus })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Capacity</label>
          <input
            type="number"
            min={1}
            max={500}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Price / hr (VND)</label>
            <input
              type="number"
              min={1}
              value={form.pricePerHour}
              onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Peak / hr (optional)</label>
            <input
              type="number"
              min={0}
              value={form.peakPricePerHour}
              onChange={(e) => setForm({ ...form, peakPricePerHour: Number(e.target.value) })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Off-peak / hr (optional)</label>
            <input
              type="number"
              min={0}
              value={form.offPeakPricePerHour}
              onChange={(e) => setForm({ ...form, offPeakPricePerHour: Number(e.target.value) })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Maintenance note (optional)</label>
          <input
            value={form.maintenanceNote}
            onChange={(e) => setForm({ ...form, maintenanceNote: e.target.value })}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p className="rounded-md bg-admin-dangerBg px-3 py-2 text-sm text-admin-danger">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-admin-border px-4 py-2 text-sm font-medium text-admin-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Court' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function VenueImagesCard({
  venueId,
  initialImages,
  onSaved,
}: {
  venueId: number
  initialImages: OwnerVenueImage[]
  onSaved: () => void
}) {
  const [staged, setStaged] = useState<VenueImageInput[]>(
    initialImages.map((img) => ({ imageUrl: img.imageUrl, displayOrder: img.displayOrder }))
  )
  const [newUrl, setNewUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setStaged(initialImages.map((img) => ({ imageUrl: img.imageUrl, displayOrder: img.displayOrder })))
  }, [initialImages])

  const isDirty = useMemo(() => {
    const originalUrls = initialImages.map((img) => img.imageUrl)
    const stagedUrls = staged.map((img) => img.imageUrl)
    return JSON.stringify(originalUrls) !== JSON.stringify(stagedUrls)
  }, [initialImages, staged])

  const addImage = () => {
    const url = newUrl.trim()
    if (!url) return
    setStaged([...staged, { imageUrl: url, displayOrder: staged.length }])
    setNewUrl('')
  }

  const removeImage = (index: number) => {
    setStaged(staged.filter((_, i) => i !== index))
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= staged.length) return
    const next = [...staged]
    ;[next[index], next[target]] = [next[target], next[index]]
    setStaged(next)
  }

  const handleSave = () => {
    setError(null)
    setIsSaving(true)
    const payload = { images: staged.map((img, i) => ({ imageUrl: img.imageUrl, displayOrder: i })) }
    ownerService
      .replaceVenueImages(venueId, payload)
      .then(() => onSaved())
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to save images.')))
      .finally(() => setIsSaving(false))
  }

  return (
    <div className="mt-6 rounded-lg border border-admin-border bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold text-admin-ink">Venue Images</h2>
      <p className="mb-4 text-xs text-admin-subtle">
        Paste an image URL to add it — file upload isn&apos;t available yet (no storage backend).
      </p>

      <div className="mb-4 flex gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          className="flex-1 rounded-md border border-admin-border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addImage}
          disabled={!newUrl.trim() || staged.length >= 20}
          className="flex items-center gap-1.5 rounded-md border border-admin-border px-3 py-2 text-sm font-medium text-admin-ink hover:bg-admin-surfaceMuted disabled:opacity-60"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {staged.length === 0 ? (
        <p className="text-sm text-admin-muted">No images yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {staged.map((img, index) => (
            <div key={`${img.imageUrl}-${index}`} className="overflow-hidden rounded-md border border-admin-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={`Venue photo ${index + 1}`}
                className="h-28 w-full bg-admin-surfaceMuted object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    aria-label="Move earlier"
                    className="rounded p-1 text-admin-muted hover:bg-admin-surfaceMuted disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === staged.length - 1}
                    aria-label="Move later"
                    className="rounded p-1 text-admin-muted hover:bg-admin-surfaceMuted disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label="Remove image"
                  className="rounded p-1 text-admin-danger hover:bg-admin-dangerBg"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-admin-dangerBg px-3 py-2 text-sm text-admin-danger">{error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save Images'}
        </button>
      </div>
    </div>
  )
}
