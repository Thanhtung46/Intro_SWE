import { JOIN_MODES, JOIN_MODE_CODES } from './matchmaking.js';

export { JOIN_MODES, JOIN_MODE_CODES };

export const GROUP_MEMBER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
});

export const GROUP_MEMBER_ROLE_CODES = Object.freeze(
  Object.values(GROUP_MEMBER_ROLES),
);

export const GROUP_JOIN_REQUEST_STATUSES = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  KICKED: 'KICKED',
});

export const GROUP_JOIN_REQUEST_STATUS_CODES = Object.freeze(
  Object.values(GROUP_JOIN_REQUEST_STATUSES),
);

/** GET /groups?location= — same trigram thresholds as kèo; kinds are name/venue/address. */
export const GROUP_SEARCH = Object.freeze({
  FUZZY_MIN_CHARS: 3,
  LIST_SIMILARITY: 0.28,
  SUGGEST_SIMILARITY: 0.2,
  SUGGEST_LIMIT: 5,
});

export const GROUP_SCHEDULE = Object.freeze({
  SLOT_STEP_MINUTES: 30,
  MIN_DURATION_MINUTES: 30,
  DAY_OF_WEEK_MIN: 1,
  DAY_OF_WEEK_MAX: 7,
  MAX_COURTS: 20,
  MAX_SLOTS: 100,
});

export const GROUP_GALLERY = Object.freeze({
  MAX_IMAGES: 50,
  DEFAULT_LIMIT: 20,
});

export const GROUP_MINE_TABS = Object.freeze({
  MANAGED: 'managed',
  JOINED: 'joined',
});

export const GROUP_MINE_TAB_CODES = Object.freeze(Object.values(GROUP_MINE_TABS));

export const GROUP_MINE_SECTIONS = Object.freeze({
  GROUPS: 'groups',
  PENDING_REQUESTS: 'pending-requests',
  JOIN_REQUESTS: 'join-requests',
});

export const GROUP_MINE_SECTION_CODES = Object.freeze(
  Object.values(GROUP_MINE_SECTIONS),
);

export function normalizeCourtName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Minutes since midnight for HH:mm or HH:mm:ss. */
export function parseLocalTimeMinutes(value) {
  const parts = String(value).trim().split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? 0);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

export function slotsOverlap(startMinutesA, durationA, startMinutesB, durationB) {
  const endA = startMinutesA + durationA;
  const endB = startMinutesB + durationB;
  return startMinutesA < endB && endA > startMinutesB;
}

/** ISO weekday 1=Mon … 7=Sun for calendar date in Asia/Bangkok. */
export function isoDayOfWeekBangkok(dateStr) {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  const utcDay = d.getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

export function formatMinutesAsTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function timeValueToMinutes(value) {
  if (value == null) {
    return null;
  }
  const text = String(value);
  const parts = text.split(':');
  return parseLocalTimeMinutes(`${parts[0]}:${parts[1]}`);
}

export function buildScheduleMatrix(courts, recurringSlots, dayOfWeek) {
  const step = GROUP_SCHEDULE.SLOT_STEP_MINUTES;
  const daySlots = recurringSlots.filter(
    (slot) => Number(slot.day_of_week) === dayOfWeek,
  );
  const slotStarts = [];
  for (let m = 0; m < 24 * 60; m += step) {
    slotStarts.push(m);
  }

  return courts.map((court) => {
    const courtSlots = daySlots.filter(
      (slot) => Number(slot.court_id) === Number(court.court_id),
    );
    return {
      courtId: court.court_id,
      name: court.name,
      slots: slotStarts.map((startMinutes) => {
        const booked = courtSlots.some((slot) => {
          const slotStart = timeValueToMinutes(slot.start_time);
          const duration = Number(slot.duration_minutes);
          if (slotStart == null) {
            return false;
          }
          return slotsOverlap(startMinutes, step, slotStart, duration);
        });
        return {
          startsAt: formatMinutesAsTime(startMinutes),
          durationMinutes: step,
          status: booked ? 'BOOKED' : 'AVAILABLE',
        };
      }),
    };
  });
}
