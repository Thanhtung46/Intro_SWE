import { MATCH_OUTCOMES, MATCH_STATUSES } from '../../shared/constants/matchmaking.js';

function readFilledCount(match) {
  return Number(match.filled_count ?? match.filledCount ?? 0);
}

function readMaxPlayers(match) {
  return Number(match.max_players ?? match.maxPlayers ?? 0);
}

function readEndsAt(match) {
  return match.ends_at ?? match.endsAt ?? null;
}

function hasEnded(match, now = Date.now()) {
  const endsAt = readEndsAt(match);
  if (!endsAt) {
    return false;
  }
  return new Date(endsAt).getTime() <= now;
}

/** Completed-tab / ended kèo — FE badge + copy. */
export function resolveMatchOutcome(match, { now = Date.now() } = {}) {
  if (!match) {
    return null;
  }

  const status = match.status;
  const filledCount = readFilledCount(match);
  const maxPlayers = readMaxPlayers(match);
  const ended = hasEnded(match, now);
  const underfilled = filledCount < maxPlayers;

  if (status === MATCH_STATUSES.CANCELLED) {
    return {
      outcome: MATCH_OUTCOMES.CANCELLED,
      message: 'Kèo đã bị hủy.',
    };
  }

  if (!ended && status !== MATCH_STATUSES.COMPLETED) {
    return null;
  }

  if (underfilled) {
    return {
      outcome: MATCH_OUTCOMES.CANCELLED,
      message: `Kèo đã bị hủy vì hết hạn mà chưa đủ người tham gia (${filledCount}/${maxPlayers}).`,
    };
  }

  return {
    outcome: MATCH_OUTCOMES.COMPLETED,
    message: 'Kèo đã hoàn thành.',
  };
}

export function attachMatchOutcome(target, match, options) {
  const resolved = resolveMatchOutcome(match, options);
  if (!resolved) {
    return target;
  }
  return {
    ...target,
    outcome: resolved.outcome,
    outcomeMessage: resolved.message,
  };
}
