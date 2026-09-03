import { createClient } from '@supabase/supabase-js';
import config from '../config/env.js';

let client = null;

function getClient() {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error(
      'Supabase Storage is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in spot-backend/.env)',
    );
  }
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

/**
 * Uploads a buffer to Supabase Storage and returns its public URL. `path` is
 * the object key within the configured bucket, e.g. "facilities/12-abc.jpg".
 * Storage bucket must already exist and be set to public (create it once in
 * the Supabase dashboard — this client does not create buckets).
 */
export async function uploadBufferToStorage(path, buffer, contentType) {
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(config.supabase.storageBucket)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(config.supabase.storageBucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort delete (e.g. replacing an old avatar) — never throws. */
export async function deleteFromStorage(path) {
  try {
    const supabase = getClient();
    await supabase.storage.from(config.supabase.storageBucket).remove([path]);
  } catch {
    /* ignore — old object cleanup is not worth failing the request over */
  }
}

/**
 * Recovers the bucket object path from a public URL previously returned by
 * uploadBufferToStorage, or null if the URL isn't one of ours (e.g. a legacy
 * local-disk /uploads/... URL from before the Supabase Storage migration).
 */
export function storagePathFromPublicUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const marker = `/storage/v1/object/public/${config.supabase.storageBucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
