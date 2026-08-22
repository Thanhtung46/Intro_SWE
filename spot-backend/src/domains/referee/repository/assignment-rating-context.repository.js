export async function findRatingPromptContextByAssignmentId(client, assignmentId) {
  const { rows } = await client.query(
    `SELECT
       a.assignment_id,
       a.booking_id,
       a.referee_id,
       a.status AS assignment_status,
       b.player_id,
       b.hire_referee,
       b.status AS booking_status,
       upper(b.booking_time_range) AS ends_at,
       v.name AS venue_name,
       rp.full_name AS referee_name
     FROM schema_referee.referee_assignments a
     INNER JOIN schema_booking.bookings b ON b.booking_id = a.booking_id
     INNER JOIN schema_venue.venues v ON v.venue_id = a.venue_id
     LEFT JOIN schema_auth.user_profiles rp ON rp.user_id = a.referee_id
     WHERE a.assignment_id = $1
     LIMIT 1`,
    [assignmentId],
  );
  return rows[0] ?? null;
}
