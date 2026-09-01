export async function insertSlots(client, groupId, slots) {
  if (!slots.length) {
    return [];
  }

  const values = [];
  const params = [];
  slots.forEach((slot, index) => {
    const base = index * 5;
    values.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
    );
    params.push(
      groupId,
      slot.courtId,
      slot.dayOfWeek,
      slot.startsAt,
      slot.durationMinutes,
    );
  });

  const { rows } = await client.query(
    `INSERT INTO schema_groups.group_schedule_slots (
       group_id, court_id, day_of_week, start_time, duration_minutes
     ) VALUES ${values.join(', ')}
     RETURNING slot_id, group_id, court_id, day_of_week, start_time, duration_minutes`,
    params,
  );
  return rows;
}

export async function findByGroupId(client, groupId) {
  const { rows } = await client.query(
    `SELECT s.slot_id, s.group_id, s.court_id, s.day_of_week, s.start_time,
            s.duration_minutes, c.name AS court_name
     FROM schema_groups.group_schedule_slots s
     JOIN schema_groups.group_courts c ON c.court_id = s.court_id
     WHERE s.group_id = $1
     ORDER BY s.day_of_week ASC, s.start_time ASC, c.sort_order ASC`,
    [groupId],
  );
  return rows;
}

export async function deleteByGroupId(client, groupId) {
  await client.query(
    `DELETE FROM schema_groups.group_schedule_slots WHERE group_id = $1`,
    [groupId],
  );
}
