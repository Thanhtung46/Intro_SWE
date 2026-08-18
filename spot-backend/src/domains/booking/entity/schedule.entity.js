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

  if (row.item_type === 'MATCH') {
    item.role = row.match_role ?? null;
  }

  return item;
}
