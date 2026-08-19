import {
  SYSTEM_SETTING_KEYS,
  ADMIN_SETTINGS_REDIS_KEY,
  ADMIN_SETTINGS_CACHE_TTL_SECONDS,
} from '../../../shared/constants/admin.js';

export async function findAllSettings(client) {
  const { rows } = await client.query(
    `SELECT setting_key, setting_value, updated_by, updated_at
     FROM schema_auth.system_settings
     ORDER BY setting_key ASC`,
  );
  return rows;
}

export async function findSetting(client, settingKey) {
  const { rows } = await client.query(
    `SELECT setting_key, setting_value, updated_by, updated_at
     FROM schema_auth.system_settings
     WHERE setting_key = $1
     LIMIT 1`,
    [settingKey],
  );
  return rows[0] || null;
}

export async function upsertSetting(client, settingKey, settingValue, updatedBy) {
  const { rows } = await client.query(
    `INSERT INTO schema_auth.system_settings (setting_key, setting_value, updated_by)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP
     RETURNING setting_key, setting_value, updated_by, updated_at`,
    [settingKey, JSON.stringify(settingValue), updatedBy],
  );
  return rows[0];
}

export function rowsToSettingsObject(rows) {
  const out = {};
  for (const row of rows) {
    out[row.setting_key] = row.setting_value;
  }
  return {
    commissionRatePercent: out[SYSTEM_SETTING_KEYS.COMMISSION_RATE_PERCENT] ?? 10,
    paymentGateways: out[SYSTEM_SETTING_KEYS.PAYMENT_GATEWAYS] ?? {
      momo: { enabled: false },
      vnpay: { enabled: false },
    },
    otpExpirySeconds: out[SYSTEM_SETTING_KEYS.OTP_EXPIRY_SECONDS] ?? 300,
    defaultCancellationWindowHours:
      out[SYSTEM_SETTING_KEYS.DEFAULT_CANCELLATION_WINDOW_HOURS] ?? 24,
    updatedAt: rows.reduce(
      (latest, row) =>
        !latest || new Date(row.updated_at) > new Date(latest)
          ? row.updated_at
          : latest,
      null,
    ),
  };
}

export async function getCachedSettings(redis, client) {
  try {
    const cached = await redis.get(ADMIN_SETTINGS_REDIS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    /* soft-fail */
  }

  const rows = await findAllSettings(client);
  const settings = rowsToSettingsObject(rows);

  try {
    await redis.setex(
      ADMIN_SETTINGS_REDIS_KEY,
      ADMIN_SETTINGS_CACHE_TTL_SECONDS,
      JSON.stringify(settings),
    );
  } catch {
    /* soft-fail */
  }

  return settings;
}

export async function invalidateSettingsCache(redis) {
  try {
    await redis.del(ADMIN_SETTINGS_REDIS_KEY);
  } catch {
    /* soft-fail */
  }
}
