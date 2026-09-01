import { useCallback, useEffect, useState } from 'react'
import { ScheduleGrid } from '../components/bookings/ScheduleGrid'
import { CreateBookingDialog } from '../components/bookings/CreateBookingDialog'
import { EmptyState } from '../components/common/EmptyState'
import { getSchedule } from '../services/ownerApi'
import { useOwnerStore } from '../state/ownerStore'
import type { Schedule, ScheduleField, ScheduleSlot } from '../types/owner'

const LEGEND: { state: string; label: string; className: string }[] = [
  { state: 'AVAILABLE', label: 'Available', className: 'owner-legend__dot' },
  { state: 'BOOKED', label: 'Booked', className: 'owner-legend__dot' },
  { state: 'UNPAID', label: 'Unpaid', className: 'owner-legend__dot' },
  { state: 'MAINTENANCE', label: 'Maintenance', className: 'owner-legend__dot' },
]

const LEGEND_COLORS: Record<string, string> = {
  AVAILABLE: '#fff',
  BOOKED: '#15803d',
  UNPAID: '#b45309',
  MAINTENANCE: '#94a3b8',
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

  if (!venue) {
    return <EmptyState title="No venue yet" description="Create a venue on the Facilities page first." />
  }

  const hasAnyBooking = schedule?.fields.some((f) => f.slots.some((s) => s.state !== 'AVAILABLE'))

  return (
    <div>
      <div className="owner-page-header">
        <div>
          <h1>Schedule</h1>
          <p>{venue.name}</p>
        </div>
      </div>

      <div className="owner-schedule-toolbar">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="owner-field"
          style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6 }}
        />
        <div className="owner-legend">
          {LEGEND.map((item) => (
            <span key={item.state}>
              <span
                className={item.className}
                style={{ background: LEGEND_COLORS[item.state], border: '1px solid #cbd5e1' }}
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
    </div>
  )
}
