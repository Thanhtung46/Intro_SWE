import type { ScheduleSlot } from '../../types/owner'

interface SlotCellProps {
  slot: ScheduleSlot
  onSelect?: (slot: ScheduleSlot) => void
}

export function SlotCell({ slot, onSelect }: SlotCellProps) {
  const clickable = slot.state === 'AVAILABLE' && Boolean(onSelect)
  const title =
    slot.state === 'AVAILABLE'
      ? `${slot.startTime}–${slot.endTime} · Available`
      : `${slot.startTime}–${slot.endTime} · ${slot.state}${slot.customerName ? ` · ${slot.customerName}` : ''}`

  return (
    <div
      className={`owner-slot owner-slot--${slot.state}`}
      title={title}
      role={clickable ? 'button' : undefined}
      onClick={clickable ? () => onSelect?.(slot) : undefined}
    >
      {slot.state === 'AVAILABLE' ? '' : slot.startTime}
    </div>
  )
}
