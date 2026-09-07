import { formatTimeInZone } from '../../booking/entity/booking.entity.js';

export function toPublicTransaction(row, extras = {}) {
  if (!row) return null;

  return {
    transactionId: row.transaction_id,
    bookingId: row.booking_id,
    provider: row.provider,
    amountVnd: row.amount_vnd,
    status: row.status,
    paymentUrl: row.payment_url ?? null,
    expiresAt: row.expires_at,
    paidAt: row.paid_at ?? null,
    failureReason: row.failure_reason ?? null,
    createdAt: row.created_at,
    ...extras,
  };
}

export function toPublicPaymentSummary(row) {
  if (!row) return null;

  const depositAmount = Number(row.deposit_amount);
  const refereeFeeVnd =
    row.hire_referee && row.referee_fee_vnd != null
      ? Number(row.referee_fee_vnd)
      : 0;
  const payableAmountVnd = Math.round(depositAmount + refereeFeeVnd);

  return {
    bookingId: row.booking_id,
    bookingCode: row.booking_code ?? null,
    status: row.status,
    bookingDate:
      typeof row.booking_date === 'string'
        ? row.booking_date.slice(0, 10)
        : row.booking_date,
    startTime: formatTimeInZone(row.starts_at),
    endTime: formatTimeInZone(row.ends_at),
    venue: {
      venueId: row.venue_id,
      name: row.venue_name,
      address: row.venue_address,
    },
    field: {
      fieldId: row.field_id,
      name: row.field_name,
      sportType: row.sport_type,
    },
    totalAmount: Number(row.total_amount),
    depositAmount,
    hireReferee: Boolean(row.hire_referee),
    refereeFeeVnd: row.referee_fee_vnd != null ? Number(row.referee_fee_vnd) : null,
    payableAmountVnd,
    paymentExpiresAt: row.payment_expires_at ?? null,
    gateways: row.gateways ?? { momo: { enabled: false }, vnpay: { enabled: false } },
  };
}

export function formatBookingCode(bookingId) {
  return `SPOT-${String(bookingId).padStart(6, '0')}`;
}

export function formatInvoiceNumber(bookingId, issuedAt = new Date()) {
  const datePart = issuedAt.toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${datePart}-${String(bookingId).padStart(6, '0')}`;
}
