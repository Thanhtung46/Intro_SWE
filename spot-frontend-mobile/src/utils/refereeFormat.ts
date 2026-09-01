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
