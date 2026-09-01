import { createHash } from 'crypto';
import pool from '../../../shared/database/pool.js';
import redis from '../../../shared/database/redis.js';
import logger from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import {
  REVENUE_CURRENCY,
  OWNER_REVENUE_CACHE_PREFIX,
  OWNER_REVENUE_CACHE_TTL_SECONDS,
  OWNER_REVENUE_EXPORT_MAX_ROWS,
} from '../../../shared/constants/owner.js';
import * as revenueRepository from '../repository/revenue.repository.js';

async function ensureRedis() {
  if (redis.status === 'ready') return;
  if (redis.status === 'connecting' || redis.status === 'connect') return;
  if (redis.status === 'wait' || redis.status === 'end' || redis.status === 'close') {
    await redis.connect();
  }
}

function cacheKey(ownerId, suffix, filters) {
  const hash = createHash('sha256')
    .update(JSON.stringify(filters))
    .digest('hex')
    .slice(0, 16);
  return `${OWNER_REVENUE_CACHE_PREFIX}${ownerId}:${suffix}:${hash}`;
}

async function readCache(key) {
  try {
    await ensureRedis();
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn('Owner revenue cache read failed', { error: err.message });
    return null;
  }
}

async function writeCache(key, payload) {
  try {
    await ensureRedis();
    await redis.set(key, JSON.stringify(payload), 'EX', OWNER_REVENUE_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn('Owner revenue cache write failed', { error: err.message });
  }
}

async function assertVenueScope(ownerId, venueId) {
  if (!venueId) return;
  const client = await pool.connect();
  try {
    const owns = await revenueRepository.ownerOwnsVenue(client, ownerId, venueId);
    if (!owns) {
      throw new AppError('Venue not found', 404);
    }
  } finally {
    client.release();
  }
}

export async function getRevenueSummary(ownerId, query) {
  await assertVenueScope(ownerId, query.venueId);

  const key = cacheKey(ownerId, 'summary', query);
  const cached = await readCache(key);
  if (cached) return { ...cached, source: 'cache' };

  const client = await pool.connect();
  try {
    const [totalRevenue, bySportRows] = await Promise.all([
      revenueRepository.sumTotalRevenue(client, ownerId, query),
      revenueRepository.sumRevenueBySport(client, ownerId, query),
    ]);

    const payload = {
      totalRevenue,
      currency: REVENUE_CURRENCY,
      revenueSource: 'bookings',
      bySport: bySportRows.map((row) => ({
        sportType: row.sport_type,
        revenue: Number(row.revenue),
        bookingCount: row.booking_count,
      })),
      period: { from: query.from, to: query.to },
    };

    await writeCache(key, payload);
    return { ...payload, source: 'db' };
  } finally {
    client.release();
  }
}

export async function getRevenueTimeseries(ownerId, query) {
  await assertVenueScope(ownerId, query.venueId);

  const key = cacheKey(ownerId, `timeseries:${query.granularity}`, query);
  const cached = await readCache(key);
  if (cached) return { ...cached, source: 'cache' };

  const client = await pool.connect();
  try {
    const rows = await revenueRepository.revenueTimeseries(
      client,
      ownerId,
      query,
      query.granularity,
    );
    const payload = {
      granularity: query.granularity,
      points: rows.map((row) => ({
        period: row.period_start,
        revenue: Number(row.revenue),
        bookingCount: row.booking_count,
      })),
      period: { from: query.from, to: query.to },
    };
    await writeCache(key, payload);
    return { ...payload, source: 'db' };
  } finally {
    client.release();
  }
}

export async function exportRevenueCsv(ownerId, query) {
  await assertVenueScope(ownerId, query.venueId);

  const client = await pool.connect();
  try {
    const rows = await revenueRepository.revenueExportRows(
      client,
      ownerId,
      query,
      OWNER_REVENUE_EXPORT_MAX_ROWS,
    );

    const header =
      'booking_id,booking_date,venue_name,field_name,sport_type,status,total_amount';
    const lines = rows.map((row) =>
      [
        row.booking_id,
        row.booking_date,
        csvEscape(row.venue_name),
        csvEscape(row.field_name),
        csvEscape(row.sport_type),
        row.status,
        row.total_amount,
      ].join(','),
    );

    return {
      filename: `spot-revenue-${query.from}-${query.to}.csv`,
      content: [header, ...lines].join('\n'),
    };
  } finally {
    client.release();
  }
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
