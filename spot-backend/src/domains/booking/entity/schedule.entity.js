export function toPublicScheduleItem(row) {
  if (!row) return null;

  const item = {
    type: row.item_type,
    bookingId: row.booking_id,
    matchId: row.match_id ?? null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    bookingDate:
      typeof row.booking_date === 'string'
        ? row.booking_date.slice(0, 10)
        : row.booking_date,
    status: row.booking_status,
    venueName: row.venue_name,
    fieldName: row.field_name,
    address: row.address,
    sportType: row.sport_type,
  };

  item.totalAmountVnd =
    row.item_type === 'BOOKING' && row.total_amount != null
      ? Number(row.total_amount)
      : null;

  if (row.item_type === 'MATCH') {
    item.role = row.match_role ?? null;
  }

  // A booking review is a durable server fact (schema_review.reviews has a
  // UNIQUE booking_id) — the FE must not rely on its own in-memory state to
  // remember this across remounts/refetches, so it's always returned here.
  item.alreadyReviewed = row.item_type === 'BOOKING' ? Boolean(row.has_review) : false;

  return item;
}
