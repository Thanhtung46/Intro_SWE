import logger from '../../../shared/utils/logger.js';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';
import { createNotification } from '../../notification/service/notification.service.js';

/**
 * In-app (+ optional email) notification when a referee receives a new
 * match invitation after booking fan-out.
 */
export async function notifyRefereeInvitation({
  refereeId,
  assignmentId,
  bookingId,
  venueName,
  sportType,
  startsAt,
  feeVnd,
}) {
  const startLabel = startsAt
    ? new Date(startsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : 'soon';

  const title = 'New referee match invitation';
  const body = [
    `A match at ${venueName ?? 'a venue'} needs a referee.`,
    `Sport: ${sportType ?? 'N/A'}.`,
    `Time: ${startLabel}.`,
    feeVnd != null ? `Fee: ${Number(feeVnd).toLocaleString('vi-VN')} VND.` : null,
    'Open Invitations → Pending to accept.',
  ]
    .filter(Boolean)
    .join(' ');

  try {
    await createNotification({
      userId: refereeId,
      type: NOTIFICATION_TYPES.REFEREE_INVITATION,
      title,
      body,
      data: {
        action: 'REFEREE_INVITATION',
        assignmentId,
        bookingId,
        venueName: venueName ?? null,
        sportType: sportType ?? null,
        startsAt: startsAt ?? null,
        feeVnd: feeVnd ?? null,
      },
      sendEmail: true,
    });
  } catch (err) {
    logger.warn('Referee invitation notification failed', {
      error: err.message,
      refereeId,
      assignmentId,
      bookingId,
    });
  }
}

/**
 * In-app (+ optional email) notification asking the player to rate the referee
 * after the match has ended.
 */
export async function notifyPlayerRateReferee({
  playerId,
  assignmentId,
  bookingId,
  refereeId,
  venueName,
  refereeName,
}) {
  const title = 'Rate your referee';
  const label = refereeName?.trim() || 'your referee';
  const body = [
    `How was ${label} at ${venueName ?? 'your match'}?`,
    'Tap to leave a star rating (0.5–5.0).',
  ].join(' ');

  try {
    return await createNotification({
      userId: playerId,
      type: NOTIFICATION_TYPES.REFEREE_RATING_REQUEST,
      title,
      body,
      data: {
        action: 'REFEREE_RATING_REQUEST',
        assignmentId,
        bookingId,
        refereeId,
        venueName: venueName ?? null,
        refereeName: refereeName ?? null,
      },
      sendEmail: true,
    });
  } catch (err) {
    logger.warn('Referee rating request notification failed', {
      error: err.message,
      playerId,
      assignmentId,
      bookingId,
    });
    return null;
  }
}
