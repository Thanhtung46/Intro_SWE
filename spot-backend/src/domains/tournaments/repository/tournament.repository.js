import {
  LISTABLE_TOURNAMENT_STATUSES,
  TOURNAMENT_JOIN_REQUEST_STATUSES,
  TOURNAMENT_SEARCH,
  TOURNAMENT_STATUSES,
  HOSTED_BY_LABEL,
} from '../../../shared/constants/tournaments.js';

const FOLD = 'schema_matchmaking.fold_search_text';

function locationPredicate(locationSlot) {
  const q = `${FOLD}(${locationSlot})`;
  const title = `${FOLD}(t.title)`;
  const venue = `${FOLD}(t.venue_name)`;
  const address = `${FOLD}(t.venue_address)`;
  const hay = `(${title} || ' ' || ${venue} || ' ' || ${address})`;
  return `(
    ${q} <> ''
    AND (
      position(${q} in ${title}) > 0
      OR position(${q} in ${venue}) > 0
      OR position(${q} in ${address}) > 0
      OR (
        length(${q}) >= ${TOURNAMENT_SEARCH.FUZZY_MIN_CHARS}
        AND GREATEST(
          similarity(${title}, ${q}),
          similarity(${venue}, ${q}),
          similarity(${address}, ${q})
        ) >= ${TOURNAMENT_SEARCH.LIST_SIMILARITY}
      )
      OR (
        ${q} LIKE '% %'
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(string_to_array(${q}, ' ')) AS tok(t)
          WHERE length(tok.t) > 0
            AND position(tok.t in ${hay}) = 0
        )
      )
    )
  )`;
}

const TOURNAMENT_SELECT = `
  t.tournament_id, t.organizer_user_id, t.sport, t.format, t.gender_division,
  t.title, t.description, t.cover_url, t.venue_name, t.venue_address,
  t.province, t.city, t.venue_lat, t.venue_lng,
  t.starts_at, t.ends_at, t.registration_deadline,
  t.max_teams, t.accepted_team_count, t.registration_fee_vnd, t.prize_pool_vnd,
  t.status, t.hosted_by_label, t.winners_json, t.created_at, t.updated_at,
  op.full_name AS organizer_full_name,
  op.avatar_url AS organizer_avatar_url
`;

function buildListWhere(filters, { bindViewer = false, omitLocation = false, listableOnly = true } = {}) {
  const where = ['TRUE'];
  const params = [];

  function add(value) {
    params.push(value);
    return `$${params.length}`;
  }

  if (listableOnly) {
    const statusSlot = add([...LISTABLE_TOURNAMENT_STATUSES]);
    where.push(`t.status = ANY(${statusSlot}::text[])`);
  }

  if (filters.sport) {
    where.push(`t.sport = ${add(filters.sport)}`);
  }
  let locationSlot = null;
  if (filters.location && !omitLocation) {
    locationSlot = add(filters.location);
    where.push(locationPredicate(locationSlot));
  }
  if (filters.province) {
    where.push(`t.province = ${add(filters.province)}`);
  }
  if (filters.city) {
    where.push(`t.city = ${add(filters.city)}`);
  }
  if (
    filters.latitude != null &&
    filters.longitude != null &&
    filters.radiusKm != null
  ) {
    const latSlot = add(filters.latitude);
    const lngSlot = add(filters.longitude);
    const radiusSlot = add(filters.radiusKm);
    where.push(
      `(
         6371 * acos(LEAST(1::float, GREATEST(-1::float,
           cos(radians(${latSlot})) * cos(radians(t.venue_lat))
             * cos(radians(t.venue_lng) - radians(${lngSlot}))
           + sin(radians(${latSlot})) * sin(radians(t.venue_lat))
         )))
       ) <= ${radiusSlot}`,
    );
  }

  let viewerSlot = null;
  if (bindViewer || filters.favorited) {
    viewerSlot = add(filters.viewerUserId);
  }
  if (filters.favorited) {
    where.push(
      `EXISTS (
         SELECT 1 FROM schema_tournaments.tournament_favorites f
         WHERE f.tournament_id = t.tournament_id AND f.user_id = ${viewerSlot}
       )`,
    );
  }

  if (filters.viewerUserId != null) {
    const browseViewerSlot = add(filters.viewerUserId);
    const hiddenStatuses = [
      TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING,
      TOURNAMENT_JOIN_REQUEST_STATUSES.ACCEPTED,
      TOURNAMENT_JOIN_REQUEST_STATUSES.KICKED,
    ];
    const hiddenSlot = add(hiddenStatuses);
    where.push(
      `NOT EXISTS (
         SELECT 1
         FROM schema_tournaments.tournament_join_requests r
         WHERE r.tournament_id = t.tournament_id
           AND r.captain_user_id = ${browseViewerSlot}
           AND r.status = ANY(${hiddenSlot}::text[])
       )`,
    );
  }

  return { where, params, add, viewerSlot, locationSlot };
}

export async function createTournament(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_tournaments.tournaments (
       organizer_user_id, sport, format, gender_division, title, description,
       cover_url, venue_name, venue_address, province, city, venue_lat, venue_lng,
       starts_at, ends_at, registration_deadline, max_teams, registration_fee_vnd,
       prize_pool_vnd, status, hosted_by_label
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12, $13,
       $14, $15, $16, $17, $18,
       $19, $20, $21
     )
     RETURNING tournament_id, organizer_user_id, sport, format, gender_division,
               title, description, cover_url, venue_name, venue_address,
               province, city, venue_lat, venue_lng, starts_at, ends_at,
               registration_deadline, max_teams, accepted_team_count,
               registration_fee_vnd, prize_pool_vnd, status, hosted_by_label,
               winners_json, created_at, updated_at`,
    [
      input.organizerUserId,
      input.sport,
      input.format,
      input.genderDivision ?? null,
      input.title,
      input.description,
      input.coverUrl,
      input.venueName,
      input.venueAddress,
      input.province,
      input.city,
      input.latitude,
      input.longitude,
      input.startsAt,
      input.endsAt,
      input.registrationDeadline,
      input.maxTeams,
      input.registrationFeeVnd,
      input.prizePoolVnd,
      TOURNAMENT_STATUSES.OPEN_REGISTRATION,
      HOSTED_BY_LABEL,
    ],
  );
  return rows[0];
}

export async function listTournaments(client, filters) {
  const { where, params, add, viewerSlot, locationSlot } = buildListWhere(
    filters,
    { bindViewer: true, listableOnly: true },
  );
  const limitSlot = add(filters.limit);
  const offsetSlot = add(filters.offset);
  const orderBy = locationSlot
    ? `GREATEST(
         similarity(${FOLD}(t.title), ${FOLD}(${locationSlot})),
         similarity(${FOLD}(t.venue_name), ${FOLD}(${locationSlot})),
         similarity(${FOLD}(t.venue_address), ${FOLD}(${locationSlot}))
       ) DESC, t.created_at DESC`
    : 't.created_at DESC';

  const { rows } = await client.query(
    `SELECT ${TOURNAMENT_SELECT},
            EXISTS (
              SELECT 1 FROM schema_tournaments.tournament_favorites f
              WHERE f.tournament_id = t.tournament_id AND f.user_id = ${viewerSlot}
            ) AS is_favorited
     FROM schema_tournaments.tournaments t
     JOIN schema_auth.users ou ON ou.user_id = t.organizer_user_id
     LEFT JOIN schema_auth.user_profiles op ON op.user_id = ou.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT ${limitSlot} OFFSET ${offsetSlot}`,
    params,
  );
  return rows;
}

export async function countTournaments(client, filters) {
  const { where, params } = buildListWhere(filters, { listableOnly: true });
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_tournaments.tournaments t
     WHERE ${where.join(' AND ')}`,
    params,
  );
  return rows[0]?.total ?? 0;
}

export async function listSearchSuggestions(client, filters) {
  if (!filters.location) {
    return [];
  }
  const { where, params, add } = buildListWhere(filters, {
    omitLocation: true,
    listableOnly: true,
  });
  const qSlot = add(filters.location);
  const limitSlot = add(TOURNAMENT_SEARCH.SUGGEST_LIMIT);
  const { rows } = await client.query(
    `SELECT kind, value, score
     FROM (
       SELECT 'title'::text AS kind, t.title AS value,
              similarity(${FOLD}(t.title), ${FOLD}(${qSlot})) AS score
       FROM schema_tournaments.tournaments t
       WHERE ${where.join(' AND ')}
       UNION ALL
       SELECT 'venueName', t.venue_name,
              similarity(${FOLD}(t.venue_name), ${FOLD}(${qSlot}))
       FROM schema_tournaments.tournaments t
       WHERE ${where.join(' AND ')}
       UNION ALL
       SELECT 'venueAddress', t.venue_address,
              similarity(${FOLD}(t.venue_address), ${FOLD}(${qSlot}))
       FROM schema_tournaments.tournaments t
       WHERE ${where.join(' AND ')}
     ) s
     WHERE score >= ${TOURNAMENT_SEARCH.SUGGEST_SIMILARITY}
       AND value IS NOT NULL AND trim(value) <> ''
     ORDER BY score DESC, value ASC
     LIMIT ${limitSlot}`,
    params,
  );
  return rows;
}

export async function findById(client, tournamentId, viewerUserId = null) {
  const params = [tournamentId];
  let viewerJoin = '';
  let extraSelect = 'FALSE AS is_favorited, NULL::text AS my_join_status';
  if (viewerUserId != null) {
    params.push(viewerUserId);
    viewerJoin = `
      LEFT JOIN schema_tournaments.tournament_favorites fav
        ON fav.tournament_id = t.tournament_id AND fav.user_id = $2
      LEFT JOIN schema_tournaments.tournament_join_requests jr
        ON jr.tournament_id = t.tournament_id AND jr.captain_user_id = $2`;
    extraSelect = `
      (fav.user_id IS NOT NULL) AS is_favorited,
      jr.status AS my_join_status,
      (t.organizer_user_id = $2) AS viewer_is_organizer`;
  }

  const { rows } = await client.query(
    `SELECT ${TOURNAMENT_SELECT}, ${extraSelect}
     FROM schema_tournaments.tournaments t
     JOIN schema_auth.users ou ON ou.user_id = t.organizer_user_id
     LEFT JOIN schema_auth.user_profiles op ON op.user_id = ou.user_id
     ${viewerJoin}
     WHERE t.tournament_id = $1
     LIMIT 1`,
    params,
  );
  return rows[0] || null;
}

export async function lockById(client, tournamentId) {
  const { rows } = await client.query(
    `SELECT ${TOURNAMENT_SELECT}
     FROM schema_tournaments.tournaments t
     JOIN schema_auth.users ou ON ou.user_id = t.organizer_user_id
     LEFT JOIN schema_auth.user_profiles op ON op.user_id = ou.user_id
     WHERE t.tournament_id = $1
     LIMIT 1
     FOR UPDATE OF t`,
    [tournamentId],
  );
  return rows[0] || null;
}

export async function adjustAcceptedTeamCount(client, tournamentId, delta) {
  const { rows } = await client.query(
    `UPDATE schema_tournaments.tournaments
     SET accepted_team_count = accepted_team_count + $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE tournament_id = $1
     RETURNING accepted_team_count, max_teams, status`,
    [tournamentId, delta],
  );
  return rows[0] || null;
}

export async function updateStatus(client, tournamentId, status) {
  const { rows } = await client.query(
    `UPDATE schema_tournaments.tournaments
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE tournament_id = $1
     RETURNING tournament_id, status`,
    [tournamentId, status],
  );
  return rows[0] || null;
}

const UPDATE_FIELD_MAP = Object.freeze({
  title: 'title',
  description: 'description',
  coverUrl: 'cover_url',
  venueName: 'venue_name',
  venueAddress: 'venue_address',
  province: 'province',
  city: 'city',
  latitude: 'venue_lat',
  longitude: 'venue_lng',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
  registrationDeadline: 'registration_deadline',
  registrationFeeVnd: 'registration_fee_vnd',
  prizePoolVnd: 'prize_pool_vnd',
  winnersJson: 'winners_json',
});

export async function updateTournament(client, tournamentId, fields) {
  const sets = [];
  const params = [tournamentId];

  for (const [inputKey, column] of Object.entries(UPDATE_FIELD_MAP)) {
    if (fields[inputKey] !== undefined) {
      const value =
        inputKey === 'winnersJson' && fields[inputKey] != null
          ? JSON.stringify(fields[inputKey])
          : fields[inputKey];
      params.push(value);
      if (inputKey === 'winnersJson') {
        sets.push(`${column} = $${params.length}::jsonb`);
      } else {
        sets.push(`${column} = $${params.length}`);
      }
    }
  }

  if (!sets.length) {
    return null;
  }

  sets.push('updated_at = CURRENT_TIMESTAMP');
  const { rows } = await client.query(
    `UPDATE schema_tournaments.tournaments t
     SET ${sets.join(', ')}
     WHERE t.tournament_id = $1
     RETURNING t.tournament_id`,
    params,
  );
  return rows[0] || null;
}

export async function listHostedByOrganizer(client, { organizerUserId, limit, offset }) {
  const { rows } = await client.query(
    `SELECT ${TOURNAMENT_SELECT},
            (
              SELECT COUNT(*)::int
              FROM schema_tournaments.tournament_join_requests r
              WHERE r.tournament_id = t.tournament_id
                AND r.status = '${TOURNAMENT_JOIN_REQUEST_STATUSES.PENDING}'
            ) AS pending_request_count,
            FALSE AS is_favorited,
            TRUE AS viewer_is_organizer
     FROM schema_tournaments.tournaments t
     JOIN schema_auth.users ou ON ou.user_id = t.organizer_user_id
     LEFT JOIN schema_auth.user_profiles op ON op.user_id = ou.user_id
     WHERE t.organizer_user_id = $1
     ORDER BY t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [organizerUserId, limit, offset],
  );
  return rows;
}

export async function countHostedByOrganizer(client, organizerUserId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_tournaments.tournaments
     WHERE organizer_user_id = $1`,
    [organizerUserId],
  );
  return rows[0]?.total ?? 0;
}

export async function listJoinedByCaptain(client, { captainUserId, limit, offset }) {
  const { rows } = await client.query(
    `SELECT ${TOURNAMENT_SELECT},
            FALSE AS is_favorited,
            FALSE AS viewer_is_organizer
     FROM schema_tournaments.tournament_join_requests r
     INNER JOIN schema_tournaments.tournaments t ON t.tournament_id = r.tournament_id
     JOIN schema_auth.users ou ON ou.user_id = t.organizer_user_id
     LEFT JOIN schema_auth.user_profiles op ON op.user_id = ou.user_id
     WHERE r.captain_user_id = $1
       AND r.status = '${TOURNAMENT_JOIN_REQUEST_STATUSES.ACCEPTED}'
     ORDER BY t.starts_at DESC, t.tournament_id DESC
     LIMIT $2 OFFSET $3`,
    [captainUserId, limit, offset],
  );
  return rows;
}

export async function countJoinedByCaptain(client, captainUserId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_tournaments.tournament_join_requests r
     WHERE r.captain_user_id = $1
       AND r.status = '${TOURNAMENT_JOIN_REQUEST_STATUSES.ACCEPTED}'`,
    [captainUserId],
  );
  return rows[0]?.total ?? 0;
}

export async function listTeamLogosByTournamentIds(client, tournamentIds) {
  if (!tournamentIds.length) {
    return new Map();
  }
  const { rows } = await client.query(
    `SELECT tournament_id, team_logo_url
     FROM schema_tournaments.tournament_teams
     WHERE tournament_id = ANY($1::int[])
     ORDER BY tournament_id, team_id ASC`,
    [tournamentIds],
  );
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.tournament_id) || [];
    list.push(row.team_logo_url);
    map.set(row.tournament_id, list);
  }
  return map;
}

export async function listExpiredRegistrationOpen(client) {
  const { rows } = await client.query(
    `SELECT tournament_id, organizer_user_id, title
     FROM schema_tournaments.tournaments
     WHERE status = $1
       AND registration_deadline < CURRENT_TIMESTAMP
     FOR UPDATE SKIP LOCKED`,
    [TOURNAMENT_STATUSES.OPEN_REGISTRATION],
  );
  return rows;
}

export async function listReadyToStart(client) {
  const { rows } = await client.query(
    `SELECT tournament_id, organizer_user_id, title
     FROM schema_tournaments.tournaments
     WHERE status = $1
       AND starts_at <= CURRENT_TIMESTAMP
     FOR UPDATE SKIP LOCKED`,
    [TOURNAMENT_STATUSES.FULL],
  );
  return rows;
}

export async function listReadyToComplete(client) {
  const { rows } = await client.query(
    `SELECT tournament_id, organizer_user_id, title
     FROM schema_tournaments.tournaments
     WHERE status = $1
       AND ends_at <= CURRENT_TIMESTAMP
     FOR UPDATE SKIP LOCKED`,
    [TOURNAMENT_STATUSES.ACTIVE],
  );
  return rows;
}

export async function listAcceptedCaptainUserIds(client, tournamentId) {
  const { rows } = await client.query(
    `SELECT DISTINCT captain_user_id
     FROM schema_tournaments.tournament_join_requests
     WHERE tournament_id = $1
       AND status = $2`,
    [tournamentId, TOURNAMENT_JOIN_REQUEST_STATUSES.ACCEPTED],
  );
  return rows.map((row) => Number(row.captain_user_id));
}
