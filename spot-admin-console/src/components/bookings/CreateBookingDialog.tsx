import { useState, type FormEvent } from 'react'
import { createManualBooking } from '../../services/ownerApi'
import type { ScheduleField, ScheduleSlot } from '../../types/owner'

interface CreateBookingDialogProps {
  field: ScheduleField
  slot: ScheduleSlot
  bookingDate: string
  onClose: () => void
  onCreated: () => void
}

export function CreateBookingDialog({
  field,
  slot,
  bookingDate,
  onClose,
  onCreated,
}: CreateBookingDialogProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [markPaid, setMarkPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createManualBooking({
        fieldId: field.fieldId,
        bookingDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        customerName,
        customerPhone: customerPhone || undefined,
        totalAmount: Number(totalAmount) || 0,
        markPaid,
      })
      onCreated()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        setError('This slot is no longer available. Refresh and try another slot.')
      } else if (status === 422) {
        setError('This field is not currently bookable.')
      } else {
        setError('Could not create the booking.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="owner-modal-backdrop" onClick={onClose}>
      <div className="owner-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>New booking</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: -8 }}>
          {field.name} · {bookingDate} · {slot.startTime}–{slot.endTime}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="owner-field">
            <label htmlFor="customerName">Customer name</label>
            <input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div className="owner-field">
            <label htmlFor="customerPhone">Phone (optional)</label>
            <input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
          <div className="owner-field">
            <label htmlFor="totalAmount">Amount (VND)</label>
            <input
              id="totalAmount"
              type="number"
              min={0}
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
            />
          </div>
          <div className="owner-field">
            <label>
              <input
                type="checkbox"
                checked={markPaid}
                onChange={(e) => setMarkPaid(e.target.checked)}
                style={{ width: 'auto', marginRight: 8 }}
              />
              Collected payment now (cash)
            </label>
          </div>
          {error && <p className="owner-error-text">{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="owner-btn" type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create booking'}
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
