import type { ScheduleSlot } from '../../types/owner'

interface SlotCellProps {
  slot: ScheduleSlot
  width: number
  onSelect?: () => void
}

export function SlotCell({ slot, width, onSelect }: SlotCellProps) {
  return (
    <div
      className={`owner-slot owner-slot--${slot.state}`}
      style={{ width, minWidth: width }}
      title={slot.state === 'AVAILABLE' ? `${slot.startTime} — Available` : undefined}
      role={onSelect ? 'button' : undefined}
      onClick={onSelect}
    />
  )
}
