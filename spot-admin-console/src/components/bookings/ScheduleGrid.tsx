import { SlotCell } from './SlotCell'
import type { ScheduleField, ScheduleSlot } from '../../types/owner'

const SLOT_WIDTH = 70 // px, half of Figma's 140px-per-hour column

interface Span {
  slot: ScheduleSlot
  startIndex: number
  count: number
}

/** Merge consecutive 30-min slots that belong to the same booking into one visual block. */
function buildSpans(slots: ScheduleSlot[]): Span[] {
  const spans: Span[] = []
  slots.forEach((slot, index) => {
    if (slot.state === 'AVAILABLE') return
    const prev = spans[spans.length - 1]
    if (prev && prev.slot.bookingId === slot.bookingId && prev.startIndex + prev.count === index) {
      prev.count += 1
      return
    }
    spans.push({ slot, startIndex: index, count: 1 })
  })
  return spans
}

function hourLabels(slots: ScheduleSlot[]): { label: string; count: number }[] {
  const labels: { label: string; count: number }[] = []
  slots.forEach((slot) => {
    const hour = slot.startTime.slice(0, 2)
    const label = `${hour}:00`
    const last = labels[labels.length - 1]
    if (last && last.label === label) {
      last.count += 1
    } else {
      labels.push({ label, count: 1 })
    }
  })
  return labels
}

interface ScheduleGridProps {
  fields: ScheduleField[]
  onSelectSlot: (field: ScheduleField, slot: ScheduleSlot) => void
  currentTimeOffset?: number
}

export function ScheduleGrid({ fields, onSelectSlot, currentTimeOffset }: ScheduleGridProps) {
  const referenceSlots = fields.find((f) => f.slots.length > 0)?.slots ?? []
  const hours = hourLabels(referenceSlots)
  const gridWidth = referenceSlots.length * SLOT_WIDTH

  return (
    <div className="owner-schedule-grid">
      <div className="owner-schedule-grid__header">
        <div className="owner-schedule-grid__resources-label">RESOURCES</div>
        <div style={{ display: 'flex' }}>
          {hours.map((h, i) => (
            <div
              key={`${h.label}-${i}`}
              className="owner-schedule-grid__hour"
              style={{ minWidth: h.count * SLOT_WIDTH, width: h.count * SLOT_WIDTH }}
            >
              {h.label}
            </div>
          ))}
        </div>
      </div>

      {fields.map((field) => {
        const spans = buildSpans(field.slots)
        const isBlocked = field.status === 'MAINTENANCE' || field.status === 'INACTIVE'
        return (
          <div className="owner-schedule-row" key={field.fieldId}>
            <div className="owner-schedule-row__label">
              <div className="owner-schedule-row__label-title">
                <span>{field.sportType === 'Badminton' ? '\u{1F3F8}' : '⚽'}</span>
                {field.name}
              </div>
              <div className="owner-schedule-row__label-sub">{field.sportType}</div>
            </div>

            {isBlocked ? (
              <div className="owner-schedule-row__maintenance" style={{ width: gridWidth || 480 }}>
                Under maintenance
              </div>
            ) : (
              <div className="owner-schedule-row__slots" style={{ width: gridWidth }}>
                {field.slots.map((slot) => (
                  <SlotCell
                    key={slot.startTime}
                    slot={slot}
                    width={SLOT_WIDTH}
                    onSelect={slot.state === 'AVAILABLE' ? () => onSelectSlot(field, slot) : undefined}
                  />
                ))}
                {spans.map((span) => (
                  <div
                    key={`${span.slot.bookingId}-${span.startIndex}`}
                    className={`owner-booking-block owner-booking-block--${span.slot.state}`}
                    style={{
                      left: span.startIndex * SLOT_WIDTH + 4,
                      width: span.count * SLOT_WIDTH - 8,
                    }}
                    title={`${span.slot.customerName ?? ''} · ${span.slot.state}`}
                  >
                    <div className="owner-booking-block__name">{span.slot.customerName ?? 'Booking'}</div>
                    <div className="owner-booking-block__meta">
                      {span.slot.startTime}–
                      {field.slots[span.startIndex + span.count - 1]?.endTime} ·{' '}
                      {span.slot.state === 'UNPAID' ? 'Unpaid' : 'Paid'}
                    </div>
                  </div>
                ))}
                {typeof currentTimeOffset === 'number' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: currentTimeOffset * SLOT_WIDTH,
                      width: 2,
                      background: 'rgba(37,99,235,0.4)',
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
