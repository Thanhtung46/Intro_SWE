// Small date/time helpers for referee screens. spot-backend works entirely
// in Asia/Bangkok (SCHEDULE_TIMEZONE) — GET /referee/schedule.confirmedDates
// and GET /referee/earnings.chartPoints[].day come back as full ISO UTC
// timestamps (e.g. "2026-09-03T17:00:00.000Z" = 2026-09-04 in Bangkok), NOT
// "YYYY-MM-DD". Everything here pins Asia/Bangkok so day/month never drift.

const TZ = 'Asia/Bangkok';

/** ISO string -> "YYYY-MM-DD" in Bangkok (matches how the backend bucketed it). */
export function bangkokYmd(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** "Sat, Oct 12" */
export function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function hm(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** "08:00 - 10:00" (or just "08:00" when there is no end time). */
export function formatTimeRange(startsAt: string, endsAt: string | null): string {
  return endsAt ? `${hm(startsAt)} - ${hm(endsAt)}` : hm(startsAt);
}

/** "Oct 12, 08:00 - 10:00" — compact single-line form for confirmed/completed cards. */
export function formatWhen(startsAt: string, endsAt: string | null): string {
  const date = new Date(startsAt).toLocaleDateString('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
  });
  return `${date}, ${formatTimeRange(startsAt, endsAt)}`;
}

/** "YYYY-MM" for the current month in Bangkok. */
export function currentMonth(): string {
  return bangkokYmd(new Date().toISOString()).slice(0, 7);
}

// ---- Earnings chart helpers ----------------------------------------------

/**
 * Short VND label for chart axes / bar tops. Rounds first, then picks the
 * unit, so a value that rounds up across a threshold is promoted (999_999 →
 * "1.0tr", not "1000k"). Non-positive / non-finite → "0đ".
 */
export function formatCompactVnd(vnd: number): string {
  if (!Number.isFinite(vnd) || vnd <= 0) return '0đ';
  if (vnd < 1_000) return `${Math.round(vnd)}đ`;
  if (vnd < 1_000_000) {
    const k = Math.round(vnd / 1_000);
    return k >= 1_000 ? `${(k / 1_000).toFixed(1)}tr` : `${k}k`;
  }
  return `${(vnd / 1_000_000).toFixed(1)}tr`;
}

function addUtcDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The single source of truth for "which week does a day belong to" — the ISO
 * Monday on/before `ymd` ("YYYY-MM-DD"). Used for both bucketing the earnings
 * day-points and computing the current-week key, so they always line up.
 */
export function weekKeyOf(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7; // getUTCDay: 0=Sun..6=Sat
  return addUtcDays(ymd, -daysSinceMonday);
}

/**
 * The weeks that overlap a month, as { key = ISO-Monday date, index = 1-based }.
 * Week 1's Monday can fall in the previous month (e.g. 2026-09 starts on a
 * Tuesday → week 1 key = "2026-08-31").
 */
export function weeksOfMonth(month: string): { key: string; index: number }[] {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lastYmd = `${month}-${String(lastDay).padStart(2, '0')}`;
  const weeks: { key: string; index: number }[] = [];
  let cur = weekKeyOf(`${month}-01`);
  let i = 1;
  while (cur <= lastYmd) {
    weeks.push({ key: cur, index: i });
    cur = addUtcDays(cur, 7);
    i += 1;
  }
  return weeks;
}

/**
 * The `count` months ending at `anchor` ("YYYY-MM"), oldest first, as
 * { key = "YYYY-MM", monthIndex = 0-11 } (caller maps monthIndex → a localized
 * abbreviation).
 */
export function recentMonths(anchor: string, count: number): { key: string; monthIndex: number }[] {
  const [y, m] = anchor.split('-').map(Number);
  const out: { key: string; monthIndex: number }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      monthIndex: d.getUTCMonth(),
    });
  }
  return out;
}
