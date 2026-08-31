import {
  GROUP_JOIN_REQUEST_STATUSES,
  GROUP_SEARCH,
} from '../../../shared/constants/groups.js';

const FOLD = 'schema_matchmaking.fold_search_text';

function locationPredicate(locationSlot) {
  const q = `${FOLD}(${locationSlot})`;
  const name = `${FOLD}(g.name)`;
  const venue = `${FOLD}(g.venue_name)`;
  const address = `${FOLD}(g.venue_address)`;
  const hay = `(${name} || ' ' || ${venue} || ' ' || ${address})`;
  return `(
    ${q} <> ''
    AND (
      position(${q} in ${name}) > 0
      OR position(${q} in ${venue}) > 0
      OR position(${q} in ${address}) > 0
      OR (
        length(${q}) >= ${GROUP_SEARCH.FUZZY_MIN_CHARS}
        AND GREATEST(
          similarity(${name}, ${q}),
          similarity(${venue}, ${q}),
          similarity(${address}, ${q})
        ) >= ${GROUP_SEARCH.LIST_SIMILARITY}
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

const GROUP_SELECT = `
  g.group_id, g.admin_user_id, g.sport, g.name, g.title, g.description,
  g.logo_url, g.cover_url, g.venue_name, g.venue_address, g.province, g.city,
  g.venue_lat, g.venue_lng, g.skill_min, g.skill_max, g.skill_min_rank,
  g.skill_max_rank, g.all_levels, g.join_mode, g.zalo_url, g.member_count,
  g.created_at, g.updated_at,
  ap.full_name AS admin_full_name,
  ap.avatar_url AS admin_avatar_url
`;

export async function createGroup(client, input) {
  const { rows } = await client.query(
    `INSERT INTO schema_groups.groups (
       admin_user_id, sport, name, title, description, logo_url, cover_url,
       venue_name, venue_address, province, city, venue_lat, venue_lng,
       skill_min, skill_max, skill_min_rank, skill_max_rank, all_levels,
       join_mode, zalo_url, member_count
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12, $13,
       $14, $15, $16, $17, $18,
       $19, $20, 1
     )
     RETURNING group_id, admin_user_id, sport, name, title, description,
               logo_url, cover_url, venue_name, venue_address, province, city,
               venue_lat, venue_lng, skill_min, skill_max, skill_min_rank,
               skill_max_rank, all_levels, join_mode, zalo_url, member_count,
               created_at, updated_at`,
    [
      input.adminUserId,
      input.sport,
      input.name,
      input.title,
      input.description ?? null,
      input.logoUrl ?? null,
      input.coverUrl ?? null,
      input.venueName,
      input.venueAddress,
      input.province,
      input.city,
      input.latitude ?? null,
      input.longitude ?? null,
      input.skillMin,
      input.skillMax,
      input.skillMinRank,
      input.skillMaxRank,
      input.allLevels,
      input.joinMode,
      input.zaloUrl ?? null,
    ],
  );
  return rows[0];
}

function buildListGroupWhere(
  filters,
  { bindViewer = false, omitLocation = false } = {},
) {
  const where = ['TRUE'];
  const params = [];

  function add(value) {
    params.push(value);
    return `$${params.length}`;
  }

  if (filters.sport) {
    where.push(`g.sport = ${add(filters.sport)}`);
  }
  if (filters.skillRanks?.length) {
    const slot = add(filters.skillRanks);
    where.push(
      `EXISTS (
         SELECT 1
         FROM unnest(${slot}::int[]) AS r(rank)
         WHERE g.skill_min_rank <= r.rank
           AND g.skill_max_rank >= r.rank
       )`,
    );
  }
  let locationSlot = null;
  if (filters.location && !omitLocation) {
    locationSlot = add(filters.location);
    where.push(locationPredicate(locationSlot));
  }
  if (filters.province) {
    where.push(`g.province = ${add(filters.province)}`);
  }
  if (filters.city) {
    where.push(`g.city = ${add(filters.city)}`);
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
      `g.venue_lat IS NOT NULL
       AND g.venue_lng IS NOT NULL
       AND (
         6371 * acos(LEAST(1::float, GREATEST(-1::float,
           cos(radians(${latSlot})) * cos(radians(g.venue_lat))
             * cos(radians(g.venue_lng) - radians(${lngSlot}))
           + sin(radians(${latSlot})) * sin(radians(g.venue_lat))
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
         FROM schema_groups.group_favorites f
         WHERE f.group_id = g.group_id
           AND f.user_id = ${viewerSlot}
       )`,
    );
  }

  if (filters.viewerUserId != null) {
    const browseViewerSlot = add(filters.viewerUserId);
    where.push(
      `NOT EXISTS (
         SELECT 1
         FROM schema_groups.group_members gm
         WHERE gm.group_id = g.group_id
           AND gm.user_id = ${browseViewerSlot}
       )`,
    );
    const hiddenRequestStatuses = [
      GROUP_JOIN_REQUEST_STATUSES.PENDING,
      GROUP_JOIN_REQUEST_STATUSES.KICKED,
    ];
    const hiddenStatusSlot = add(hiddenRequestStatuses);
    where.push(
      `NOT EXISTS (
         SELECT 1
         FROM schema_groups.group_join_requests r
         WHERE r.group_id = g.group_id
           AND r.user_id = ${browseViewerSlot}
           AND r.status = ANY(${hiddenStatusSlot}::text[])
       )`,
    );
  }

  return { where, params, add, viewerSlot, locationSlot };
}

export async function listGroups(client, filters) {
  const { where, params, add, viewerSlot, locationSlot } = buildListGroupWhere(
    filters,
    { bindViewer: true },
  );
  const limitSlot = add(filters.limit);
  const offsetSlot = add(filters.offset);
  const orderBy = locationSlot
    ? `GREATEST(
         similarity(${FOLD}(g.name), ${FOLD}(${locationSlot})),
         similarity(${FOLD}(g.venue_name), ${FOLD}(${locationSlot})),
         similarity(${FOLD}(g.venue_address), ${FOLD}(${locationSlot}))
       ) DESC, g.created_at DESC`
    : 'g.created_at DESC';

  const { rows } = await client.query(
    `SELECT ${GROUP_SELECT},
            EXISTS (
              SELECT 1
              FROM schema_groups.group_favorites f
              WHERE f.group_id = g.group_id
                AND f.user_id = ${viewerSlot}
            ) AS is_favorited,
            NULL::text AS my_role
     FROM schema_groups.groups g
     JOIN schema_auth.users au ON au.user_id = g.admin_user_id
     LEFT JOIN schema_auth.user_profiles ap ON ap.user_id = au.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT ${limitSlot} OFFSET ${offsetSlot}`,
    params,
  );
  return rows;
}

export async function countGroups(client, filters) {
  const { where, params } = buildListGroupWhere(filters);
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_groups.groups g
     WHERE ${where.join(' AND ')}`,
    params,
  );
  return rows[0]?.total ?? 0;
}

export async function listSearchSuggestions(client, filters) {
  if (!filters.location) {
    return [];
  }
  const { where, params, add } = buildListGroupWhere(filters, {
    omitLocation: true,
  });
  const qSlot = add(filters.location);
  const q = `${FOLD}(${qSlot})`;
  const name = `${FOLD}(g.name)`;
  const venue = `${FOLD}(g.venue_name)`;
  const address = `${FOLD}(g.venue_address)`;

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
         SELECT g.name AS text,
                'name'::text AS kind,
                similarity(${name}, ${q})::float AS score
         FROM schema_groups.groups g
         WHERE ${where.join(' AND ')}
           AND ${q} <> ''
           AND ${name} <> ${q}
           AND similarity(${name}, ${q}) >= ${GROUP_SEARCH.SUGGEST_SIMILARITY}
         UNION ALL
         SELECT g.venue_name,
                'venueName',
                similarity(${venue}, ${q})::float
         FROM schema_groups.groups g
         WHERE ${where.join(' AND ')}
           AND ${q} <> ''
           AND ${venue} <> ${q}
           AND similarity(${venue}, ${q}) >= ${GROUP_SEARCH.SUGGEST_SIMILARITY}
         UNION ALL
         SELECT g.venue_address,
                'venueAddress',
                similarity(${address}, ${q})::float
         FROM schema_groups.groups g
         WHERE ${where.join(' AND ')}
           AND ${q} <> ''
           AND ${address} <> ${q}
           AND similarity(${address}, ${q}) >= ${GROUP_SEARCH.SUGGEST_SIMILARITY}
       ) s
     ) ranked
     WHERE rn = 1
     ORDER BY score DESC, text ASC
     LIMIT ${GROUP_SEARCH.SUGGEST_LIMIT}`,
    params,
  );
  return rows;
}

export async function findById(client, groupId, viewerUserId = null) {
  const { rows } = await client.query(
    `SELECT ${GROUP_SELECT},
            ($2::int IS NOT NULL AND EXISTS (
               SELECT 1
               FROM schema_groups.group_favorites f
               WHERE f.group_id = g.group_id
                 AND f.user_id = $2
            )) AS is_favorited,
            (
              SELECT gm.role
              FROM schema_groups.group_members gm
              WHERE gm.group_id = g.group_id
                AND gm.user_id = $2
              LIMIT 1
            ) AS my_role
     FROM schema_groups.groups g
     JOIN schema_auth.users au ON au.user_id = g.admin_user_id
     LEFT JOIN schema_auth.user_profiles ap ON ap.user_id = au.user_id
     WHERE g.group_id = $1
     LIMIT 1`,
    [groupId, viewerUserId],
  );
  return rows[0] || null;
}

export async function lockById(client, groupId) {
  const { rows } = await client.query(
    `SELECT ${GROUP_SELECT}
     FROM schema_groups.groups g
     JOIN schema_auth.users au ON au.user_id = g.admin_user_id
     LEFT JOIN schema_auth.user_profiles ap ON ap.user_id = au.user_id
     WHERE g.group_id = $1
     LIMIT 1
     FOR UPDATE OF g`,
    [groupId],
  );
  return rows[0] || null;
}

export async function adjustMemberCount(client, groupId, delta) {
  const { rows } = await client.query(
    `UPDATE schema_groups.groups
     SET member_count = member_count + $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE group_id = $1
     RETURNING member_count`,
    [groupId, delta],
  );
  return rows[0]?.member_count ?? null;
}

export async function updateAdminUserId(client, groupId, adminUserId) {
  await client.query(
    `UPDATE schema_groups.groups
     SET admin_user_id = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE group_id = $1`,
    [groupId, adminUserId],
  );
}

export async function deleteById(client, groupId) {
  const { rowCount } = await client.query(
    `DELETE FROM schema_groups.groups WHERE group_id = $1`,
    [groupId],
  );
  return rowCount > 0;
}

const UPDATE_FIELD_MAP = {
  name: 'name',
  title: 'title',
  description: 'description',
  logoUrl: 'logo_url',
  coverUrl: 'cover_url',
  venueName: 'venue_name',
  venueAddress: 'venue_address',
  province: 'province',
  city: 'city',
  latitude: 'venue_lat',
  longitude: 'venue_lng',
  skillMin: 'skill_min',
  skillMax: 'skill_max',
  skillMinRank: 'skill_min_rank',
  skillMaxRank: 'skill_max_rank',
  allLevels: 'all_levels',
  joinMode: 'join_mode',
  zaloUrl: 'zalo_url',
  sport: 'sport',
};

export async function updateGroup(client, groupId, fields) {
  const sets = [];
  const params = [groupId];

  for (const [inputKey, column] of Object.entries(UPDATE_FIELD_MAP)) {
    if (fields[inputKey] !== undefined) {
      params.push(fields[inputKey]);
      sets.push(`${column} = $${params.length}`);
    }
  }

  if (!sets.length) {
    return null;
  }

  sets.push('updated_at = CURRENT_TIMESTAMP');
  const { rows } = await client.query(
    `UPDATE schema_groups.groups
     SET ${sets.join(', ')}
     WHERE group_id = $1
     RETURNING group_id, admin_user_id, sport, name, title, description,
               logo_url, cover_url, venue_name, venue_address, province, city,
               venue_lat, venue_lng, skill_min, skill_max, skill_min_rank,
               skill_max_rank, all_levels, join_mode, zalo_url, member_count,
               created_at, updated_at`,
    params,
  );
  return rows[0] || null;
}

function mineGroupSelect(viewerSlot) {
  return `
    SELECT ${GROUP_SELECT},
           EXISTS (
             SELECT 1
             FROM schema_groups.group_favorites f
             WHERE f.group_id = g.group_id
               AND f.user_id = ${viewerSlot}
           ) AS is_favorited,
           gm.role AS my_role,
           (
             SELECT COUNT(*)::int
             FROM schema_groups.group_join_requests r
             WHERE r.group_id = g.group_id
               AND r.status = 'PENDING'
           ) AS pending_request_count
    FROM schema_groups.groups g
    JOIN schema_auth.users au ON au.user_id = g.admin_user_id
    LEFT JOIN schema_auth.user_profiles ap ON ap.user_id = au.user_id
  `;
}

export async function listManagedGroups(
  client,
  { adminUserId, limit, offset, viewerUserId },
) {
  const params = [adminUserId, viewerUserId, limit, offset];
  const { rows } = await client.query(
    `${mineGroupSelect('$2')}
     INNER JOIN schema_groups.group_members gm
       ON gm.group_id = g.group_id AND gm.user_id = $1
     WHERE g.admin_user_id = $1
       AND gm.role = 'ADMIN'
     ORDER BY g.created_at DESC, g.group_id DESC
     LIMIT $3 OFFSET $4`,
    params,
  );
  return rows;
}

export async function countManagedGroups(client, adminUserId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_groups.groups g
     WHERE g.admin_user_id = $1`,
    [adminUserId],
  );
  return rows[0]?.total ?? 0;
}

export async function listJoinedMemberGroups(
  client,
  { userId, limit, offset, viewerUserId },
) {
  const { rows } = await client.query(
    `${mineGroupSelect('$3')}
     INNER JOIN schema_groups.group_members gm
       ON gm.group_id = g.group_id AND gm.user_id = $1
     WHERE gm.user_id = $1
       AND gm.role = 'MEMBER'
     ORDER BY gm.joined_at DESC, g.group_id DESC
     LIMIT $2 OFFSET $4`,
    [userId, limit, viewerUserId, offset],
  );
  return rows;
}

export async function countJoinedMemberGroups(client, userId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_groups.group_members gm
     WHERE gm.user_id = $1
       AND gm.role = 'MEMBER'`,
    [userId],
  );
  return rows[0]?.total ?? 0;
}
