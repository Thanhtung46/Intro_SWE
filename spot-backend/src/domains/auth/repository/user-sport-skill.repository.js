export async function findByUserId(client, userId) {
  const { rows } = await client.query(
    `SELECT sport, skill_level
     FROM schema_auth.user_sport_skills
     WHERE user_id = $1
     ORDER BY sport`,
    [userId],
  );
  return rows;
}

export async function findSkillsByUserIdsAndSport(client, userIds, sport) {
  if (!userIds.length) {
    return new Map();
  }
  const { rows } = await client.query(
    `SELECT user_id, skill_level
     FROM schema_auth.user_sport_skills
     WHERE user_id = ANY($1::int[])
       AND sport = $2`,
    [userIds, sport],
  );
  return new Map(rows.map((row) => [Number(row.user_id), row.skill_level]));
}

export async function upsertSkill(client, { userId, sport, skillLevel }) {
  const { rows } = await client.query(
    `INSERT INTO schema_auth.user_sport_skills (user_id, sport, skill_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, sport)
     DO UPDATE SET
       skill_level = EXCLUDED.skill_level,
       updated_at = CURRENT_TIMESTAMP
     RETURNING user_id, sport, skill_level`,
    [userId, sport, skillLevel],
  );
  return rows[0] || null;
}

export async function deleteSkill(client, { userId, sport }) {
  const { rowCount } = await client.query(
    `DELETE FROM schema_auth.user_sport_skills
     WHERE user_id = $1 AND sport = $2`,
    [userId, sport],
  );
  return rowCount;
}
