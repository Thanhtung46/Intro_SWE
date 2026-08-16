import {
  JOIN_REQUEST_STATUSES,
  LISTABLE_MATCH_STATUSES,
  MATCH_SEARCH,
  MATCH_STATUSES,
  MINE_TABS,
} from '../../../shared/constants/matchmaking.js';

const FOLD = 'schema_matchmaking.fold_search_text';

function locationPredicate(locationSlot) {
  const q = `${FOLD}(${locationSlot})`;
  const title = `${FOLD}(m.title)`;
  const venue = `${FOLD}(m.venue_name)`;
  const hay = `(${title} || ' ' || ${venue})`;
  return `(
    ${q} <> ''
    AND (
      position(${q} in ${title}) > 0
      OR position(${q} in ${venue}) > 0
      OR (
        length(${q}) >= ${MATCH_SEARCH.FUZZY_MIN_CHARS}
        AND GREATEST(similarity(${title}, ${q}), similarity(${venue}, ${q}))
          >= ${MATCH_SEARCH.LIST_SIMILARITY}
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

const MATCH_SELECT = `
  m.match_id, m.host_user_id, m.sport, m.format, m.title, m.notes, m.cover_url,
  m.venue_name, m.venue_address, m.province, m.city, m.venue_lat, m.venue_lng,
  m.starts_at, m.ends_at, m.is_multi_day, m.is_recurring,
  m.max_players, m.filled_count, m.skill_min, m.skill_max,
  m.skill_min_rank, m.skill_max_rank, m.all_levels, m.fee_type,
  m.price_min, m.price_max, m.join_mode, m.status, m.created_at,
  p.full_name AS host_full_name,
  p.avatar_url AS host_avatar_url,
  u.phone_number AS host_phone_number,
  (
    SELECT COUNT(*)::int
    FROM schema_matchmaking.matches hm
    WHERE hm.host_user_id = m.host_user_id
      AND hm.status <> 'CANCELLED'
  ) AS host_match_count
`;

export async function createMatch(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_matchmaking.matches (
       host_user_id, sport, format, title, notes, cover_url,
       venue_name, venue_address, province, city, venue_lat, venue_lng,
       starts_at, ends_at, is_multi_day, is_recurring,
       max_players, filled_count, skill_min, skill_max,
       skill_min_rank, skill_max_rank, all_levels, fee_type,
       price_min, price_max, join_mode, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12,
       $13, $14, $15, $16,
       $17, 1, $18, $19,
       $20, $21, $22, $23,
       $24, $25, $26, 'OPEN'
     )
     RETURNING match_id, host_user_id, sport, format, title, notes, cover_url,
               venue_name, venue_address, province, city, venue_lat, venue_lng,
               starts_at, ends_at, is_multi_day, is_recurring,
               max_players, filled_count, skill_min, skill_max,
               skill_min_rank, skill_max_rank, all_levels, fee_type,
               price_min, price_max, join_mode, status, created_at`,
    [
      input.hostUserId,
      input.sport,
      input.format,
      input.title,
      input.notes ?? null,
      input.coverUrl ?? null,
      input.venueName,
      input.venueAddress,
      input.province,
      input.city,
      input.latitude ?? null,
      input.longitude ?? null,
      input.startsAt,
      input.endsAt,
      input.isMultiDay,
      input.isRecurring,
      input.maxPlayers,
      input.skillMin,
      input.skillMax,
      input.skillMinRank,
      input.skillMaxRank,
      input.allLevels,
      input.feeType,
      input.priceMin ?? null,
      input.priceMax ?? null,
      input.joinMode,
    ],
  );
  return rows[0];
}

export async function lockPitches(client, pitchKeys) {
  const keys = [...new Set(pitchKeys)].sort();
  for (const key of keys) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
  }
}

export async function findPitchOverlaps(
  client,
  { venueName, venueAddress, startsAt, endsAt, courtNames, excludeMatchId = null },
) {
  if (!courtNames.length) {
    return [];
  }
  const { rows } = await client.query(
    `SELECT m.match_id, m.host_user_id, m.title, m.venue_name, m.venue_address,
            m.starts_at, m.ends_at, m.status, c.name AS court_name
     FROM schema_matchmaking.matches m
     INNER JOIN schema_matchmaking.match_courts c ON c.match_id = m.match_id
     WHERE m.status = ANY($1::text[])
       AND regexp_replace(lower(trim(m.venue_name)), '\\s+', ' ', 'g')
           = regexp_replace(lower(trim($2)), '\\s+', ' ', 'g')
       AND regexp_replace(lower(trim(m.venue_address)), '\\s+', ' ', 'g')
           = regexp_replace(lower(trim($3)), '\\s+', ' ', 'g')
       AND m.starts_at < $5
       AND m.ends_at > $4
       AND regexp_replace(lower(trim(COALESCE(c.name, ''))), '\\s+', ' ', 'g')
           = ANY($6::text[])
       AND ($7::int IS NULL OR m.match_id <> $7)
     ORDER BY m.starts_at ASC
     FOR UPDATE OF m`,
    [
      LISTABLE_MATCH_STATUSES,
      venueName,
      venueAddress,
      startsAt,
      endsAt,
      courtNames,
      excludeMatchId,
    ],
  );
  return rows;
}

export async function findById(client, matchId, viewerUserId = null) {
  const { rows } = await client.query(
    `SELECT ${MATCH_SELECT},
            ($2::int IS NOT NULL AND EXISTS (
               SELECT 1
               FROM schema_matchmaking.match_favorites f
               WHERE f.match_id = m.match_id
                 AND f.user_id = $2
            )) AS is_favorited
     FROM schema_matchmaking.matches m
     JOIN schema_auth.users u ON u.user_id = m.host_user_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
     WHERE m.match_id = $1
     LIMIT 1`,
    [matchId, viewerUserId],
  );
  return rows[0] || null;
}

function buildListMatchWhere(
  filters,
  { bindViewer = false, omitLocation = false } = {},
) {
  const where = [
    `m.status = ANY($1::text[])`,
    `m.ends_at > NOW()`,
  ];
  const params = [LISTABLE_MATCH_STATUSES];

  function add(value) {
    params.push(value);
    return `$${params.length}`;
  }

  if (filters.sport) {
    where.push(`m.sport = ${add(filters.sport)}`);
  }
  if (filters.date && (filters.timeFrom || filters.timeTo)) {
    const dateSlot = add(filters.date);
    const fromSlot = add(filters.timeFrom || '00:00:00');
    const toSlot = add(filters.timeTo || '23:59:59');
    where.push(
      `m.starts_at < ((${dateSlot}::date + ${toSlot}::time) AT TIME ZONE 'Asia/Ho_Chi_Minh')
       AND m.ends_at > ((${dateSlot}::date + ${fromSlot}::time) AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
    );
  } else if (filters.date) {
    where.push(
      `(m.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ${add(filters.date)}::date`,
    );
  } else if (filters.timeFrom || filters.timeTo) {
    const localStart = `(m.starts_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::time`;
    if (filters.timeFrom) {
      where.push(`${localStart} >= ${add(filters.timeFrom)}::time`);
    }
    if (filters.timeTo) {
      where.push(`${localStart} < ${add(filters.timeTo)}::time`);
    }
  }
  if (filters.skillRanks?.length) {
    const slot = add(filters.skillRanks);
    where.push(
      `EXISTS (
         SELECT 1
         FROM unnest(${slot}::int[]) AS r(rank)
         WHERE m.skill_min_rank <= r.rank
           AND m.skill_max_rank >= r.rank
       )`,
    );
  }
  if (filters.priceMin != null && filters.priceMax != null) {
    const lo = add(filters.priceMin);
    const hi = add(filters.priceMax);
    where.push(
      `( (m.fee_type = 'GENDER_RANGE'
            AND m.price_min <= ${hi}
            AND COALESCE(m.price_max, m.price_min) >= ${lo})
        OR (m.fee_type = 'SPLIT_EVENLY'
            AND CEIL(m.price_min::numeric / NULLIF(m.max_players, 0)) >= ${lo}
            AND CEIL(m.price_min::numeric / NULLIF(m.max_players, 0)) <= ${hi}))`,
    );
  } else if (filters.priceMax != null) {
    const slot = add(filters.priceMax);
    where.push(
      `( (m.fee_type = 'GENDER_RANGE' AND m.price_min <= ${slot})
        OR (m.fee_type = 'SPLIT_EVENLY'
            AND CEIL(m.price_min::numeric / NULLIF(m.max_players, 0)) <= ${slot}))`,
    );
  } else if (filters.priceMin != null) {
    const slot = add(filters.priceMin);
    where.push(
      `( (m.fee_type = 'GENDER_RANGE'
            AND COALESCE(m.price_max, m.price_min) >= ${slot})
        OR (m.fee_type = 'SPLIT_EVENLY'
            AND CEIL(m.price_min::numeric / NULLIF(m.max_players, 0)) >= ${slot}))`,
    );
  }
  let locationSlot = null;
  if (filters.location && !omitLocation) {
    locationSlot = add(filters.location);
    where.push(locationPredicate(locationSlot));
  }
  if (filters.province) {
    where.push(`m.province = ${add(filters.province)}`);
  }
  if (filters.city) {
    where.push(`m.city = ${add(filters.city)}`);
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
      `m.venue_lat IS NOT NULL
       AND m.venue_lng IS NOT NULL
       AND (
         6371 * acos(LEAST(1::float, GREATEST(-1::float,
           cos(radians(${latSlot})) * cos(radians(m.venue_lat))
             * cos(radians(m.venue_lng) - radians(${lngSlot}))
           + sin(radians(${latSlot})) * sin(radians(m.venue_lat))
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
         SELECT 1
         FROM schema_matchmaking.match_favorites f
         WHERE f.match_id = m.match_id
           AND f.user_id = ${viewerSlot}
       )`,
    );
  }
  if (filters.hostUserId != null) {
    where.push(`m.host_user_id = ${add(filters.hostUserId)}`);
  }

  return { where, params, add, viewerSlot, locationSlot };
}

export async function listMatches(client, filters) {
  const { where, params, add, viewerSlot, locationSlot } = buildListMatchWhere(
    filters,
    { bindViewer: true },
  );
  const limitSlot = add(filters.limit);
  const offsetSlot = add(filters.offset);
  const orderBy = locationSlot
    ? `GREATEST(
         similarity(${FOLD}(m.title), ${FOLD}(${locationSlot})),
         similarity(${FOLD}(m.venue_name), ${FOLD}(${locationSlot}))
       ) DESC, m.starts_at ASC`
    : 'm.starts_at ASC';

  const { rows } = await client.query(
    `SELECT ${MATCH_SELECT},
            EXISTS (
              SELECT 1
              FROM schema_matchmaking.match_favorites f
              WHERE f.match_id = m.match_id
                AND f.user_id = ${viewerSlot}
            ) AS is_favorited
     FROM schema_matchmaking.matches m
     JOIN schema_auth.users u ON u.user_id = m.host_user_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT ${limitSlot} OFFSET ${offsetSlot}`,
    params,
  );
  return rows;
}

export async function listSearchSuggestions(client, filters) {
  if (!filters.location) {
    return [];
  }
  const { where, params, add } = buildListMatchWhere(filters, {
    omitLocation: true,
  });
  const qSlot = add(filters.location);
  const q = `${FOLD}(${qSlot})`;
  const title = `${FOLD}(m.title)`;
  const venue = `${FOLD}(m.venue_name)`;

  const { rows } = await client.query(
    `SELECT text, kind
     FROM (
       SELECT s.text,
              s.kind,
              s.score,
              ROW_NUMBER() OVER (
                PARTITION BY ${FOLD}(s.text)
                ORDER BY s.score DESC, s.text
              ) AS rn
       FROM (
         SELECT m.title AS text,
                'title'::text AS kind,
                similarity(${title}, ${q})::float AS score
         FROM schema_matchmaking.matches m
         WHERE ${where.join(' AND ')}
           AND ${q} <> ''
           AND ${title} <> ${q}
           AND similarity(${title}, ${q}) >= ${MATCH_SEARCH.SUGGEST_SIMILARITY}
         UNION ALL
         SELECT m.venue_name,
                'venueName',
                similarity(${venue}, ${q})::float
         FROM schema_matchmaking.matches m
         WHERE ${where.join(' AND ')}
           AND ${q} <> ''
           AND ${venue} <> ${q}
           AND similarity(${venue}, ${q}) >= ${MATCH_SEARCH.SUGGEST_SIMILARITY}
       ) s
     ) ranked
     WHERE rn = 1
     ORDER BY score DESC, text ASC
     LIMIT ${MATCH_SEARCH.SUGGEST_LIMIT}`,
    params,
  );
  return rows;
}

export async function countMatches(client, filters) {
  const { where, params } = buildListMatchWhere(filters);
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_matchmaking.matches m
     WHERE ${where.join(' AND ')}`,
    params,
  );
  return rows[0]?.total ?? 0;
}

export async function lockById(client, matchId) {
  const { rows } = await client.query(
    `SELECT ${MATCH_SELECT}
     FROM schema_matchmaking.matches m
     JOIN schema_auth.users u ON u.user_id = m.host_user_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
     WHERE m.match_id = $1
     LIMIT 1
     FOR UPDATE OF m`,
    [matchId],
  );
  return rows[0] || null;
}

export async function updateFilledCount(client, matchId, filledCount, status) {
  const { rows } = await client.query(
    `UPDATE schema_matchmaking.matches
     SET filled_count = $2,
         status = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE match_id = $1
     RETURNING match_id, filled_count, status, max_players`,
    [matchId, filledCount, status],
  );
  return rows[0] || null;
}

function mineWhere(tab, params) {
  if (tab === MINE_TABS.COMPLETED) {
    params.push([MATCH_STATUSES.CANCELLED, MATCH_STATUSES.COMPLETED]);
    const doneSlot = `$${params.length}`;
    params.push(LISTABLE_MATCH_STATUSES);
    const openSlot = `$${params.length}`;
    return `(
      m.status = ANY(${doneSlot}::text[])
      OR (m.status = ANY(${openSlot}::text[]) AND m.ends_at <= NOW())
    )`;
  }
  params.push(LISTABLE_MATCH_STATUSES);
  return `m.status = ANY($${params.length}::text[]) AND m.ends_at > NOW()`;
}

export async function listMine(client, { hostUserId, tab, limit, offset }) {
  const params = [hostUserId];
  const tabWhere = mineWhere(tab, params);
  params.push(limit, offset);
  const limitSlot = `$${params.length - 1}`;
  const offsetSlot = `$${params.length}`;
  const order =
    tab === MINE_TABS.COMPLETED
      ? 'm.starts_at DESC, m.match_id DESC'
      : 'm.starts_at ASC, m.match_id ASC';

  const { rows } = await client.query(
    `SELECT ${MATCH_SELECT},
            EXISTS (
              SELECT 1
              FROM schema_matchmaking.match_favorites f
              WHERE f.match_id = m.match_id
                AND f.user_id = $1
            ) AS is_favorited
     FROM schema_matchmaking.matches m
     JOIN schema_auth.users u ON u.user_id = m.host_user_id
     LEFT JOIN schema_auth.user_profiles p ON p.user_id = u.user_id
     WHERE m.host_user_id = $1
       AND ${tabWhere}
     ORDER BY ${order}
     LIMIT ${limitSlot} OFFSET ${offsetSlot}`,
    params,
  );
  return rows;
}

export async function countMine(client, { hostUserId, tab }) {
  const params = [hostUserId];
  const tabWhere = mineWhere(tab, params);
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_matchmaking.matches m
     WHERE m.host_user_id = $1
       AND ${tabWhere}`,
    params,
  );
  return rows[0]?.total ?? 0;
}

export async function countHostedByUser(client, hostUserId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_matchmaking.matches
     WHERE host_user_id = $1
       AND status <> $2`,
    [hostUserId, MATCH_STATUSES.CANCELLED],
  );
  return rows[0]?.total ?? 0;
}

export async function updateMatch(client, matchId, input) {
  const { rows } = await client.query(
    `UPDATE schema_matchmaking.matches
     SET sport = $2,
         format = $3,
         title = $4,
         notes = $5,
         venue_name = $6,
         venue_address = $7,
         province = $8,
         city = $9,
         venue_lat = $10,
         venue_lng = $11,
         starts_at = $12,
         ends_at = $13,
         is_multi_day = $14,
         is_recurring = $15,
         max_players = $16,
         skill_min = $17,
         skill_max = $18,
         skill_min_rank = $19,
         skill_max_rank = $20,
         all_levels = $21,
         fee_type = $22,
         price_min = $23,
         price_max = $24,
         join_mode = $25,
         status = $26,
         cover_url = $27,
         updated_at = CURRENT_TIMESTAMP
     WHERE match_id = $1
     RETURNING match_id, host_user_id, sport, format, title, notes, cover_url,
               venue_name, venue_address, province, city, venue_lat, venue_lng,
               starts_at, ends_at, is_multi_day, is_recurring,
               max_players, filled_count, skill_min, skill_max,
               skill_min_rank, skill_max_rank, all_levels, fee_type,
               price_min, price_max, join_mode, status, created_at`,
    [
      matchId,
      input.sport,
      input.format,
      input.title,
      input.notes ?? null,
      input.venueName,
      input.venueAddress,
      input.province,
      input.city,
      input.latitude ?? null,
      input.longitude ?? null,
      input.startsAt,
      input.endsAt,
      input.isMultiDay,
      input.isRecurring,
      input.maxPlayers,
      input.skillMin,
      input.skillMax,
      input.skillMinRank,
      input.skillMaxRank,
      input.allLevels,
      input.feeType,
      input.priceMin ?? null,
      input.priceMax ?? null,
      input.joinMode,
      input.status,
      input.coverUrl ?? null,
    ],
  );
  return rows[0];
}

export async function updateStatus(client, matchId, status) {
  const { rows } = await client.query(
    `UPDATE schema_matchmaking.matches
     SET status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE match_id = $1
     RETURNING match_id, status`,
    [matchId, status],
  );
  return rows[0] || null;
}

export async function listPreviewAvatars(client, matchIds, limitPerMatch = 3) {
  const map = new Map();
  if (!matchIds.length) {
    return map;
  }
  const { rows } = await client.query(
    `SELECT x.match_id, x.avatar_url
     FROM (
       SELECT m.match_id,
              p.avatar_url,
              0 AS kind,
              m.host_user_id AS uid
       FROM schema_matchmaking.matches m
       LEFT JOIN schema_auth.user_profiles p ON p.user_id = m.host_user_id
       WHERE m.match_id = ANY($1::int[])
       UNION ALL
       SELECT r.match_id,
              p.avatar_url,
              1 AS kind,
              r.user_id AS uid
       FROM schema_matchmaking.match_join_requests r
       LEFT JOIN schema_auth.user_profiles p ON p.user_id = r.user_id
       WHERE r.match_id = ANY($1::int[])
         AND r.status = $2
     ) x
     ORDER BY x.match_id, x.kind, x.uid`,
    [matchIds, JOIN_REQUEST_STATUSES.ACCEPTED],
  );
  for (const row of rows) {
    const list = map.get(row.match_id) || [];
    if (list.length >= limitPerMatch) {
      continue;
    }
    if (row.avatar_url) {
      list.push(row.avatar_url);
    }
    map.set(row.match_id, list);
  }
  return map;
}
