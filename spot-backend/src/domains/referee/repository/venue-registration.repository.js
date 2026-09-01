import { REFEREE_REGISTRATION_STATUSES } from '../../../shared/constants/referee.js';

export async function insertRegistration(client, {
  refereeId,
  venueId,
  sportType,
}) {
  const { rows } = await client.query(
    `INSERT INTO schema_referee.referee_venue_registrations
       (referee_id, venue_id, sport_type, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (referee_id, venue_id, sport_type) DO UPDATE
       SET status = $4,
           cancelled_at = NULL,
           created_at = CASE
             WHEN schema_referee.referee_venue_registrations.status = 'CANCELLED'
             THEN CURRENT_TIMESTAMP
             ELSE schema_referee.referee_venue_registrations.created_at
           END
     RETURNING registration_id, referee_id, venue_id, sport_type, status,
               created_at, cancelled_at`,
    [refereeId, venueId, sportType, REFEREE_REGISTRATION_STATUSES.ACTIVE],
  );
  return rows[0];
}

export async function cancelRegistration(client, {
  refereeId,
  venueId,
  sportType,
}) {
  const { rows } = await client.query(
    `UPDATE schema_referee.referee_venue_registrations
     SET status = $4,
         cancelled_at = CURRENT_TIMESTAMP
     WHERE referee_id = $1 AND venue_id = $2 AND sport_type = $3 AND status = $5
     RETURNING registration_id, referee_id, venue_id, sport_type, status,
               created_at, cancelled_at`,
    [
      refereeId,
      venueId,
      sportType,
      REFEREE_REGISTRATION_STATUSES.CANCELLED,
      REFEREE_REGISTRATION_STATUSES.ACTIVE,
    ],
  );
  return rows[0] ?? null;
}

export async function findActiveRegistration(client, {
  refereeId,
  venueId,
  sportType,
}) {
  const { rows } = await client.query(
    `SELECT registration_id, referee_id, venue_id, sport_type, status,
            created_at, cancelled_at
     FROM schema_referee.referee_venue_registrations
     WHERE referee_id = $1 AND venue_id = $2 AND sport_type = $3 AND status = $4`,
    [refereeId, venueId, sportType, REFEREE_REGISTRATION_STATUSES.ACTIVE],
  );
  return rows[0] ?? null;
}

export async function listActiveRegistrationsForReferee(client, refereeId) {
  const { rows } = await client.query(
    `SELECT r.registration_id, r.referee_id, r.venue_id, r.sport_type,
            r.status, r.created_at, r.cancelled_at,
            v.name AS venue_name, v.address AS venue_address,
            p.full_name AS owner_name
     FROM schema_referee.referee_venue_registrations r
     JOIN schema_venue.venues v ON v.venue_id = r.venue_id
     JOIN schema_auth.users u ON u.user_id = v.owner_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
     WHERE r.referee_id = $1 AND r.status = $2
     ORDER BY r.created_at DESC`,
    [refereeId, REFEREE_REGISTRATION_STATUSES.ACTIVE],
  );
  return rows;
}

export async function listActiveRefereesForVenueSport(client, venueId, sportType) {
  const { rows } = await client.query(
    `SELECT referee_id
     FROM schema_referee.referee_venue_registrations
     WHERE venue_id = $1 AND sport_type = $2 AND status = $3`,
    [venueId, sportType, REFEREE_REGISTRATION_STATUSES.ACTIVE],
  );
  return rows;
}

export async function listRegisteredVenueIds(client, refereeId, sportType) {
  const { rows } = await client.query(
    `SELECT venue_id
     FROM schema_referee.referee_venue_registrations
     WHERE referee_id = $1 AND sport_type = $2 AND status = $3`,
    [refereeId, sportType, REFEREE_REGISTRATION_STATUSES.ACTIVE],
  );
  return rows.map((r) => r.venue_id);
}
