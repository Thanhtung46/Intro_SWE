import { GROUP_GALLERY } from '../../../shared/constants/groups.js';

export async function countByGroupId(client, groupId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM schema_groups.group_gallery_images
     WHERE group_id = $1`,
    [groupId],
  );
  return rows[0]?.total ?? 0;
}

export async function insert(client, { groupId, imageUrl, uploadedBy, sortOrder }) {
  const { rows } = await client.query(
    `INSERT INTO schema_groups.group_gallery_images (
       group_id, image_url, uploaded_by, sort_order
     ) VALUES ($1, $2, $3, $4)
     RETURNING image_id, group_id, image_url, uploaded_by, sort_order, created_at`,
    [groupId, imageUrl, uploadedBy, sortOrder],
  );
  return rows[0];
}

export async function listByGroupId(client, groupId, { limit, offset }) {
  const { rows } = await client.query(
    `SELECT image_id, group_id, image_url, uploaded_by, sort_order, created_at
     FROM schema_groups.group_gallery_images
     WHERE group_id = $1
     ORDER BY sort_order ASC, created_at DESC, image_id DESC
     LIMIT $2 OFFSET $3`,
    [groupId, limit, offset],
  );
  return rows;
}

export async function findById(client, groupId, imageId) {
  const { rows } = await client.query(
    `SELECT image_id, group_id, image_url, uploaded_by, sort_order, created_at
     FROM schema_groups.group_gallery_images
     WHERE group_id = $1 AND image_id = $2
     LIMIT 1`,
    [groupId, imageId],
  );
  return rows[0] || null;
}

export async function deleteById(client, groupId, imageId) {
  const { rowCount } = await client.query(
    `DELETE FROM schema_groups.group_gallery_images
     WHERE group_id = $1 AND image_id = $2`,
    [groupId, imageId],
  );
  return rowCount > 0;
}

export async function nextSortOrder(client, groupId) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
     FROM schema_groups.group_gallery_images
     WHERE group_id = $1`,
    [groupId],
  );
  return Number(rows[0]?.next_order ?? 0);
}

export { GROUP_GALLERY };
