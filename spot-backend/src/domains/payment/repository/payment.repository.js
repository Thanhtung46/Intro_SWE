import {
  ACTIVE_TRANSACTION_STATUSES,
  TRANSACTION_STATUSES,
} from '../../../shared/constants/payment.js';

export async function findBookingSummaryForPayment(client, bookingId, playerId) {
  const { rows } = await client.query(
    `SELECT
       b.booking_id, b.player_id, b.field_id, b.booking_date::text AS booking_date,
       b.status, b.total_amount, b.deposit_amount, b.hire_referee, b.referee_fee_vnd,
       b.booking_code, b.payment_expires_at,
       lower(b.booking_time_range) AS starts_at,
       upper(b.booking_time_range) AS ends_at,
       f.name AS field_name, f.sport_type,
       v.venue_id, v.name AS venue_name, v.address AS venue_address
     FROM schema_booking.bookings b
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     WHERE b.booking_id = $1 AND b.player_id = $2`,
    [bookingId, playerId],
  );
  return rows[0] ?? null;
}

export async function findActiveTransactionForBooking(client, bookingId) {
  const { rows } = await client.query(
    `SELECT transaction_id, booking_id, player_id, provider, amount_vnd, status,
            provider_ref, idempotency_key, payment_url, expires_at, paid_at,
            failure_reason, created_at, updated_at
     FROM schema_payment.transactions
     WHERE booking_id = $1
       AND status = ANY($2::varchar[])
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookingId, ACTIVE_TRANSACTION_STATUSES],
  );
  return rows[0] ?? null;
}

export async function insertTransaction(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_payment.transactions (
       booking_id, player_id, provider, amount_vnd, status,
       provider_ref, idempotency_key, payment_url, expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING transaction_id, booking_id, player_id, provider, amount_vnd, status,
       provider_ref, idempotency_key, payment_url, expires_at, paid_at,
       failure_reason, created_at, updated_at`,
    [
      input.bookingId,
      input.playerId,
      input.provider,
      input.amountVnd,
      TRANSACTION_STATUSES.PENDING,
      input.providerRef,
      input.idempotencyKey,
      input.paymentUrl,
      input.expiresAt,
    ],
  );
  return rows[0];
}

export async function findTransactionByIdForPlayer(client, transactionId, playerId) {
  const { rows } = await client.query(
    `SELECT t.transaction_id, t.booking_id, t.player_id, t.provider, t.amount_vnd,
            t.status, t.provider_ref, t.idempotency_key, t.payment_url, t.expires_at,
            t.paid_at, t.failure_reason, t.created_at, t.updated_at,
            b.booking_code, b.status AS booking_status,
            b.booking_date::text AS booking_date,
            lower(b.booking_time_range) AS starts_at,
            upper(b.booking_time_range) AS ends_at,
            f.name AS field_name,
            v.name AS venue_name,
            i.invoice_number
     FROM schema_payment.transactions t
     INNER JOIN schema_booking.bookings b ON b.booking_id = t.booking_id
     INNER JOIN schema_venue.fields f ON f.field_id = b.field_id
     INNER JOIN schema_venue.venues v ON v.venue_id = f.venue_id
     LEFT JOIN schema_payment.invoices i ON i.transaction_id = t.transaction_id
     WHERE t.transaction_id = $1 AND t.player_id = $2`,
    [transactionId, playerId],
  );
  return rows[0] ?? null;
}

export async function findTransactionByIdForUpdate(client, transactionId) {
  const { rows } = await client.query(
    `SELECT transaction_id, booking_id, player_id, provider, amount_vnd, status,
            provider_ref, idempotency_key, payment_url, expires_at, paid_at,
            failure_reason, created_at, updated_at
     FROM schema_payment.transactions
     WHERE transaction_id = $1
     FOR UPDATE`,
    [transactionId],
  );
  return rows[0] ?? null;
}

export async function findTransactionByProviderRef(client, provider, providerRef) {
  const { rows } = await client.query(
    `SELECT transaction_id, booking_id, player_id, provider, amount_vnd, status,
            provider_ref, idempotency_key, payment_url, expires_at, paid_at,
            failure_reason, created_at, updated_at
     FROM schema_payment.transactions
     WHERE provider = $1 AND provider_ref = $2`,
    [provider, providerRef],
  );
  return rows[0] ?? null;
}

export async function markTransactionSuccess(client, transactionId, rawCallback) {
  const { rows } = await client.query(
    `UPDATE schema_payment.transactions
     SET status = $2,
         paid_at = CURRENT_TIMESTAMP,
         raw_callback = $3::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $1
     RETURNING transaction_id, booking_id, player_id, provider, amount_vnd, status,
       provider_ref, idempotency_key, payment_url, expires_at, paid_at,
       failure_reason, created_at, updated_at`,
    [transactionId, TRANSACTION_STATUSES.SUCCESS, JSON.stringify(rawCallback ?? {})],
  );
  return rows[0] ?? null;
}

export async function markTransactionFailed(client, transactionId, failureReason, rawCallback) {
  const { rows } = await client.query(
    `UPDATE schema_payment.transactions
     SET status = $2,
         failure_reason = $3,
         raw_callback = $4::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $1
       AND status = $5
     RETURNING transaction_id, booking_id, player_id, provider, amount_vnd, status,
       provider_ref, idempotency_key, payment_url, expires_at, paid_at,
       failure_reason, created_at, updated_at`,
    [
      transactionId,
      TRANSACTION_STATUSES.FAILED,
      failureReason,
      JSON.stringify(rawCallback ?? {}),
      TRANSACTION_STATUSES.PENDING,
    ],
  );
  return rows[0] ?? null;
}

export async function insertInvoice(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_payment.invoices (
       transaction_id, booking_id, invoice_number, pdf_path, amount_vnd
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING invoice_id, transaction_id, booking_id, invoice_number, pdf_path,
       amount_vnd, issued_at`,
    [
      input.transactionId,
      input.bookingId,
      input.invoiceNumber,
      input.pdfPath,
      input.amountVnd,
    ],
  );
  return rows[0];
}

export async function setBookingPaymentExpiresAt(client, bookingId, expiresAt) {
  await client.query(
    `UPDATE schema_booking.bookings
     SET payment_expires_at = $2, updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1`,
    [bookingId, expiresAt],
  );
}

export async function listExpiredPendingTransactions(client, limit = 50) {
  const { rows } = await client.query(
    `SELECT transaction_id, booking_id, player_id, status, expires_at
     FROM schema_payment.transactions
     WHERE status = $1
       AND expires_at < CURRENT_TIMESTAMP
     ORDER BY expires_at ASC
     LIMIT $2`,
    [TRANSACTION_STATUSES.PENDING, limit],
  );
  return rows;
}

export async function markTransactionExpired(client, transactionId) {
  const { rows } = await client.query(
    `UPDATE schema_payment.transactions
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE transaction_id = $1 AND status = $3
     RETURNING transaction_id, booking_id, player_id, status`,
    [transactionId, TRANSACTION_STATUSES.EXPIRED, TRANSACTION_STATUSES.PENDING],
  );
  return rows[0] ?? null;
}

export async function cancelBookingForExpiredPayment(client, bookingId) {
  const { rows } = await client.query(
    `UPDATE schema_booking.bookings
     SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
     WHERE booking_id = $1 AND status = 'PENDING_PAYMENT'
     RETURNING booking_id, player_id, status`,
    [bookingId],
  );
  return rows[0] ?? null;
}
