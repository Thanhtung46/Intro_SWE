export async function insertCourts(client, groupId, courts) {
  if (!courts.length) {
    return [];
  }

  const values = [];
  const params = [];
  courts.forEach((court, index) => {
    const base = index * 3;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    params.push(groupId, court.name, index);
  });

  const { rows } = await client.query(
    `INSERT INTO schema_groups.group_courts (group_id, name, sort_order)
     VALUES ${values.join(', ')}
     RETURNING court_id, group_id, name, sort_order`,
    params,
  );
  return rows;
}

export async function findByGroupId(client, groupId) {
  const { rows } = await client.query(
    `SELECT court_id, group_id, name, sort_order
     FROM schema_groups.group_courts
     WHERE group_id = $1
     ORDER BY sort_order ASC, court_id ASC`,
    [groupId],
  );
  return rows;
}

export async function findByGroupIds(client, groupIds) {
  if (!groupIds.length) {
    return [];
  }
  const { rows } = await client.query(
    `SELECT court_id, group_id, name, sort_order
     FROM schema_groups.group_courts
     WHERE group_id = ANY($1::int[])
     ORDER BY group_id ASC, sort_order ASC, court_id ASC`,
    [groupIds],
  );
  return rows;
}

export async function deleteByGroupId(client, groupId) {
  await client.query(
    `DELETE FROM schema_groups.group_courts WHERE group_id = $1`,
    [groupId],
  );
}
