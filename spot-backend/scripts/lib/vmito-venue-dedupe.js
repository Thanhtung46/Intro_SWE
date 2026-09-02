import { foldSearchText } from '../../src/shared/utils/foldSearchText.js';

/** Same normalization as match search / fold_search_text in Postgres. */
export function normalizeVenueKey(value) {
  return foldSearchText(value);
}

export function parseTimeRange(startsAt, endsAt) {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return null;
  }
  return { startMs, endMs };
}

/** True when two intervals share any time (same venue slot is impossible). */
export function venueTimesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function findVenueSlotOverlap(slots, { venueName, startsAt, endsAt }) {
  const venueKey = normalizeVenueKey(venueName);
  if (!venueKey) {
    return null;
  }
  const range = parseTimeRange(startsAt, endsAt);
  if (!range) {
    return null;
  }
  return (
    slots.find(
      (slot) =>
        slot.venueKey === venueKey &&
        venueTimesOverlap(range.startMs, range.endMs, slot.startMs, slot.endMs),
    ) ?? null
  );
}

export function rememberVenueSlot(slots, { venueName, startsAt, endsAt, slug }) {
  const venueKey = normalizeVenueKey(venueName);
  const range = parseTimeRange(startsAt, endsAt);
  if (!venueKey || !range) {
    return;
  }
  slots.push({
    venueKey,
    startMs: range.startMs,
    endMs: range.endMs,
    slug,
  });
}

/**
 * Keep first kèo per venue+time window; drop later duplicates (no rename).
 * `resolveSlot` returns { venueName, startsAt, endsAt } after any sanitization.
 */
export function filterItemsByVenueTime(items, resolveSlot, { getSlug = (item) => item.slug } = {}) {
  const kept = [];
  const skipped = [];
  const slots = [];

  for (const item of items) {
    const slot = resolveSlot(item);
    if (!slot?.venueName?.trim() || !slot.startsAt || !slot.endsAt) {
      kept.push(item);
      continue;
    }
    const conflict = findVenueSlotOverlap(slots, slot);
    if (conflict) {
      skipped.push({
        item,
        slug: getSlug(item),
        conflictsWith: conflict.slug,
      });
      continue;
    }
    rememberVenueSlot(slots, { ...slot, slug: getSlug(item) });
    kept.push(item);
  }

  return { kept, skipped, slots };
}
