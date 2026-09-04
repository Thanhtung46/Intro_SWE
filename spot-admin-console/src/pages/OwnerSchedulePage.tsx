import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScheduleGrid } from '../components/bookings/ScheduleGrid'
import { CreateBookingDialog } from '../components/bookings/CreateBookingDialog'
import { EmptyState } from '../components/common/EmptyState'
import { getSchedule } from '../services/ownerApi'
import { useOwnerStore } from '../state/ownerStore'
import type { Schedule, ScheduleField, ScheduleSlot } from '../types/owner'

const LEGEND: { state: string; label: string; color: string }[] = [
  { state: 'AVAILABLE', label: 'Available', color: '#ffffff' },
  { state: 'BOOKED', label: 'Booked / Paid', color: '#eff6ff' },
  { state: 'UNPAID', label: 'Unpaid', color: '#f8fafc' },
  { state: 'MAINTENANCE', label: 'Maintenance', color: '#fffbeb' },
]

function todayLocal(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function OwnerSchedulePage() {
  const { venue, selectedDate, setSelectedDate } = useOwnerStore()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ field: ScheduleField; slot: ScheduleSlot } | null>(null)

  const reload = useCallback(async () => {
    if (!venue) return
    setLoading(true)
    setError(null)
    try {
      const result = await getSchedule({ venueId: venue.venueId, date: selectedDate })
      setSchedule(result)
    } catch {
      setError('Could not load the schedule.')
    } finally {
      setLoading(false)
    }
  }, [venue, selectedDate])

  useEffect(() => {
    void reload()
  }, [reload])

  const currentTimeOffset = useMemo(() => {
    if (selectedDate !== todayLocal() || !schedule) return undefined
    const referenceSlots = schedule.fields.find((f) => f.slots.length > 0)?.slots
    if (!referenceSlots || referenceSlots.length === 0) return undefined
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const index = referenceSlots.findIndex((slot) => {
      const [h, m] = slot.startTime.split(':').map(Number)
      const [eh, em] = slot.endTime.split(':').map(Number)
      const start = h * 60 + m
      const end = eh * 60 + em
      return nowMinutes >= start && nowMinutes < end
    })
    if (index === -1) return undefined
    const [h, m] = referenceSlots[index].startTime.split(':').map(Number)
    const fraction = (nowMinutes - (h * 60 + m)) / 30
    return index + fraction
  }, [schedule, selectedDate])

  if (!venue) {
    return <EmptyState title="No venue yet" description="Create a venue on the Facilities page first." />
  }

  const hasAnyBooking = schedule?.fields.some((f) => f.slots.some((s) => s.state !== 'AVAILABLE'))

  return (
    <>
      <div className="owner-page-header">
        <div>
          <h1>Booking Schedule</h1>
          <p>{venue.name}</p>
        </div>
      </div>

      <div className="owner-schedule-toolbar">
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        <div className="owner-legend">
          {LEGEND.map((item) => (
            <span className="owner-legend__item" key={item.state}>
              <span
                className="owner-legend__dot"
                style={{ background: item.color, border: '1px solid #cbd5e1' }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {loading && <p>Loading schedule…</p>}
      {error && <p className="owner-error-text">{error}</p>}

      {!loading && schedule && schedule.fields.length === 0 && (
        <EmptyState title="No facilities on this venue yet" />
      )}

      {!loading && schedule && schedule.fields.length > 0 && !hasAnyBooking && (
        <EmptyState
          title="No bookings for this day"
          description="Every slot below is open — select one to add a walk-in booking."
        />
      )}

      {!loading && schedule && schedule.fields.length > 0 && (
        <ScheduleGrid
          fields={schedule.fields}
          onSelectSlot={(field, slot) => setPending({ field, slot })}
          currentTimeOffset={currentTimeOffset}
        />
      )}

      {pending && (
        <CreateBookingDialog
          field={pending.field}
          slot={pending.slot}
          bookingDate={selectedDate}
          onClose={() => setPending(null)}
          onCreated={() => {
            setPending(null)
            void reload()
          }}
        />
      )}
    </>
  )
}
