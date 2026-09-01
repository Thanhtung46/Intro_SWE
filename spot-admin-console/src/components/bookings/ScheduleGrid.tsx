import { SlotCell } from './SlotCell'
import type { ScheduleField, ScheduleSlot } from '../../types/owner'

interface ScheduleGridProps {
  fields: ScheduleField[]
  onSelectSlot: (field: ScheduleField, slot: ScheduleSlot) => void
}

export function ScheduleGrid({ fields, onSelectSlot }: ScheduleGridProps) {
  return (
    <div className="owner-schedule-grid">
      {fields.map((field) => (
        <div className="owner-schedule-row" key={field.fieldId}>
          <div className="owner-schedule-row__label">
            {field.name}
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{field.sportType}</div>
          </div>
          <div className="owner-schedule-row__slots">
            {field.status === 'MAINTENANCE' || field.status === 'INACTIVE' ? (
              <div className="owner-slot owner-slot--MAINTENANCE" style={{ width: 'auto', padding: '0 16px' }}>
                Under maintenance
              </div>
            ) : (
              field.slots.map((slot) => (
                <SlotCell
                  key={slot.startTime}
                  slot={slot}
                  onSelect={(s) => onSelectSlot(field, s)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
