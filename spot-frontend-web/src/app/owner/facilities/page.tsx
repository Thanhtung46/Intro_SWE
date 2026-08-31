'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownAZ, ArrowUpAZ, ImageOff, LayoutGrid, MapPin, Plus, TrendingUp, Wrench } from 'lucide-react'
import * as ownerService from '@/services/owner.service'
import type {
  CreateVenuePayload,
  FieldStatus,
  OwnerField,
  OwnerVenueSummary,
  SportType,
} from '@/types/owner'
import Modal from '@/components/admin/Modal'
import Toast from '@/components/admin/Toast'
import Badge, { BadgeVariant } from '@/components/admin/Badge'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatCurrency } from '@/utils/formatCurrency'

const EMPTY_FORM: CreateVenuePayload = {
  name: '',
  address: '',
  amenities: '',
  openingHours: '',
  closingHours: '',
  latitude: undefined,
  longitude: undefined,
}

function cleanPayload(form: CreateVenuePayload): CreateVenuePayload {
  const payload: CreateVenuePayload = { name: form.name.trim(), address: form.address.trim() }
  if (form.amenities?.trim()) payload.amenities = form.amenities.trim()
  if (form.openingHours) payload.openingHours = form.openingHours
  if (form.closingHours) payload.closingHours = form.closingHours
  if (form.latitude !== undefined && form.latitude !== null) payload.latitude = Number(form.latitude)
  if (form.longitude !== undefined && form.longitude !== null) payload.longitude = Number(form.longitude)
  return payload
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

interface FlatField extends OwnerField {
  venueName: string
  venueAddress: string
  venueImageUrl: string | null
}

const SPORT_FILTER_OPTIONS: { value: SportType | ''; label: string }[] = [
  { value: '', label: 'All Sports' },
  { value: 'Football', label: 'Football' },
  { value: 'Badminton', label: 'Badminton' },
]

const STATUS_FILTER_OPTIONS: { value: FieldStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'INACTIVE', label: 'Inactive' },
]

function statusBadgeVariant(status: FieldStatus): BadgeVariant {
  if (status === 'ACTIVE') return 'success'
  if (status === 'MAINTENANCE') return 'warning'
  return 'neutral'
}

export default function FacilitiesPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<OwnerVenueSummary[]>([])
  const [flatFields, setFlatFields] = useState<FlatField[]>([])
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [currency, setCurrency] = useState('VND')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [sportFilter, setSportFilter] = useState<SportType | ''>('')
  const [statusFilter, setStatusFilter] = useState<FieldStatus | ''>('')
  const [sortAsc, setSortAsc] = useState(true)

  const { toast, showToast, closeToast } = useToast()

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { items } = await ownerService.listVenues()
      setVenues(items)

      const today = toDateStr(new Date())
      const [details, revenue] = await Promise.all([
        Promise.all(items.map((v) => ownerService.getVenue(v.venueId))),
        ownerService.getRevenueSummary({ from: today, to: today }).catch(() => null),
      ])

      const flat: FlatField[] = []
      details.forEach((detail, index) => {
        const venue = items[index]
        const venueImageUrl = detail.images[0]?.imageUrl ?? null
        detail.fields.forEach((field) => {
          flat.push({ ...field, venueName: venue.name, venueAddress: venue.address, venueImageUrl })
        })
      })
      setFlatFields(flat)
      if (revenue) {
        setDailyRevenue(revenue.totalRevenue)
        setCurrency(revenue.currency)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load facilities.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const totalCourts = useMemo(() => venues.reduce((sum, v) => sum + v.fieldCount, 0), [venues])
  const maintenanceCount = useMemo(
    () => venues.reduce((sum, v) => sum + v.maintenanceFieldCount, 0),
    [venues]
  )

  const visibleFields = useMemo(() => {
    let list = flatFields
    if (sportFilter) list = list.filter((f) => f.sportType === sportFilter)
    if (statusFilter) list = list.filter((f) => f.status === statusFilter)
    return [...list].sort((a, b) => (sortAsc ? a.pricePerHour - b.pricePerHour : b.pricePerHour - a.pricePerHour))
  }, [flatFields, sportFilter, statusFilter, sortAsc])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Facility Management</h1>
          <p className="text-sm text-admin-muted">
            Manage your courts, pricing strategy, and associated services.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-md bg-admin-primary px-4 py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover"
        >
          <Plus size={16} />
          Add New Facility
        </button>
      </div>

      {isLoading && <p className="text-sm text-admin-muted">Loading...</p>}
      {error && (
        <p className="mb-4 rounded-md bg-admin-dangerBg px-4 py-3 text-sm text-admin-danger">{error}</p>
      )}

      {!isLoading && !error && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-admin-border bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-admin-infoBg text-admin-info">
                <LayoutGrid size={18} />
              </span>
              <p className="mt-3 text-xs font-semibold text-admin-muted">TOTAL COURTS</p>
              <p className="mt-1 text-2xl font-bold text-admin-ink">{totalCourts} Units</p>
            </div>
            <div className="rounded-lg border border-admin-border bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-admin-warningBg text-admin-warning">
                <TrendingUp size={18} />
              </span>
              <p className="mt-3 text-xs font-semibold text-admin-muted">DAILY REVENUE</p>
              <p className="mt-1 text-2xl font-bold text-admin-ink">{formatCurrency(dailyRevenue, currency)}</p>
            </div>
            <div className="rounded-lg border border-admin-border bg-white p-5">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-md ${
                  maintenanceCount > 0 ? 'bg-admin-dangerBg text-admin-danger' : 'bg-admin-surfaceMuted text-admin-muted'
                }`}
              >
                <Wrench size={18} />
              </span>
              <p className="mt-3 text-xs font-semibold text-admin-muted">MAINTENANCE</p>
              <p
                className={`mt-1 text-2xl font-bold ${maintenanceCount > 0 ? 'text-admin-danger' : 'text-admin-ink'}`}
              >
                {maintenanceCount} Due
              </p>
            </div>
            {/* Daily Occupancy — out of scope: GET /owner/dashboard/summary only accepts `month`,
                there is no day-specific occupancy endpoint to back this stat without fabricating a number. */}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value as SportType | '')}
              className="rounded-md border border-admin-border bg-white px-3 py-2 text-sm text-admin-ink"
            >
              {SPORT_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FieldStatus | '')}
              className="rounded-md border border-admin-border bg-white px-3 py-2 text-sm text-admin-ink"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1.5 rounded-md border border-admin-border bg-white px-3 py-2 text-sm font-medium text-admin-ink hover:bg-admin-surfaceMuted"
            >
              {sortAsc ? <ArrowUpAZ size={15} /> : <ArrowDownAZ size={15} />}
              Sort by Price ({sortAsc ? 'Low to High' : 'High to Low'})
            </button>
          </div>

          {visibleFields.length === 0 ? (
            <p className="rounded-lg border border-admin-border bg-white p-6 text-sm text-admin-muted">
              {flatFields.length === 0
                ? 'No courts yet. Add a facility, then add courts from its detail page.'
                : 'No courts match the selected filters.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFields.map((field) => (
                <div
                  key={field.fieldId}
                  className="overflow-hidden rounded-lg border border-admin-border bg-white"
                >
                  <div className="relative h-40 w-full bg-admin-surfaceMuted">
                    {field.venueImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={field.venueImageUrl}
                        alt={field.venueName}
                        className="h-40 w-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center text-admin-subtle">
                        <ImageOff size={28} />
                      </div>
                    )}
                    <div className="absolute right-3 top-3">
                      <Badge variant={statusBadgeVariant(field.status)}>{field.status}</Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-lg font-semibold text-admin-ink">{field.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-admin-muted">
                      <MapPin size={14} />
                      {field.venueName} · {field.venueAddress}
                    </p>
                    {field.maintenanceNote && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-admin-warning">
                        <Wrench size={12} />
                        {field.maintenanceNote}
                      </p>
                    )}

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

                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/owner/revenue?venueId=${field.venueId}`)}
                        className="flex-1 rounded-md border border-admin-border py-2 text-sm font-medium text-admin-primary hover:bg-admin-surfaceMuted"
                      >
                        View Analytics
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/owner/facilities/${field.venueId}`)}
                        className="flex-1 rounded-md bg-admin-primary py-2 text-sm font-semibold text-white hover:bg-admin-primaryHover"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateVenueModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            showToast('success', 'Facility created.')
            fetchAll()
          }}
        />
      )}

      {toast && <Toast toast={toast} onClose={closeToast} />}
    </div>
  )
}

function CreateVenueModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateVenuePayload>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.address.trim()) {
      setError('Name and address are required.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    ownerService
      .createVenue(cleanPayload(form))
      .then(() => onCreated())
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to create facility.')))
      .finally(() => setIsSubmitting(false))
  }

  return (
    <Modal title="Add New Facility" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            placeholder="Main Sports Complex"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            placeholder="123 Nguyen Trai, Dist 1, HCMC"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-admin-ink">Amenities (optional)</label>
          <textarea
            value={form.amenities ?? ''}
            onChange={(e) => setForm({ ...form, amenities: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            placeholder="Parking, Shower, Locker"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Opening hours (optional)</label>
            <input
              type="time"
              value={form.openingHours ?? ''}
              onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Closing hours (optional)</label>
            <input
              type="time"
              value={form.closingHours ?? ''}
              onChange={(e) => setForm({ ...form, closingHours: e.target.value })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Latitude (optional)</label>
            <input
              type="number"
              step="any"
              value={form.latitude ?? ''}
              onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-ink">Longitude (optional)</label>
            <input
              type="number"
              step="any"
              value={form.longitude ?? ''}
              onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-md border border-admin-border px-3 py-2 text-sm"
            />
          </div>
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
            {isSubmitting ? 'Creating...' : 'Create Facility'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
