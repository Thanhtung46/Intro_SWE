import logger from '../../../shared/utils/logger.js';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';
import { createNotification } from '../../notification/service/notification.service.js';

function tournamentPayload(tournament, extra = {}) {
  return {
    tournamentId: Number(tournament.tournament_id),
    title: tournament.title,
    sport: tournament.sport,
    ...extra,
  };
}

async function safeNotify(step, fn) {
  try {
    await fn();
  } catch (err) {
    logger.warn(`Tournament notification failed: ${step}`, {
      error: err.message,
    });
  }
}

export async function notifyOrganizerJoinRequest(tournament, captain, request) {
  await safeNotify('TOURNAMENT_JOIN_REQUEST', () =>
    createNotification({
      userId: Number(tournament.organizer_user_id),
      type: NOTIFICATION_TYPES.TOURNAMENT_JOIN_REQUEST,
      title: 'Yêu cầu tham gia giải',
      body: `${captain.full_name ?? 'Một đội'} muốn tham gia "${tournament.title}".`,
      data: tournamentPayload(tournament, {
        requestId: Number(request.request_id),
        captainUserId: Number(captain.user_id),
        teamName: request.team_name,
      }),
      sendEmail: false,
    }),
  );
}

export async function notifyCaptainApproved(tournament, captainUserId) {
  await safeNotify('TOURNAMENT_JOIN_APPROVED', () =>
    createNotification({
      userId: Number(captainUserId),
      type: NOTIFICATION_TYPES.TOURNAMENT_JOIN_APPROVED,
      title: 'Đã được duyệt tham gia giải',
      body: `Đội của bạn đã được chấp nhận vào "${tournament.title}".`,
      data: tournamentPayload(tournament),
      sendEmail: false,
    }),
  );
}

export async function notifyCaptainRejected(tournament, captainUserId) {
  await safeNotify('TOURNAMENT_JOIN_REJECTED', () =>
    createNotification({
      userId: Number(captainUserId),
      type: NOTIFICATION_TYPES.TOURNAMENT_JOIN_REJECTED,
      title: 'Yêu cầu tham gia bị từ chối',
      body: `Organizer đã từ chối đội của bạn tại "${tournament.title}".`,
      data: tournamentPayload(tournament),
      sendEmail: false,
    }),
  );
}

export async function notifyTournamentCancelled(tournament, userIds, reason) {
  const uniqueIds = [...new Set(userIds.map(Number).filter(Boolean))];
  for (const userId of uniqueIds) {
    await safeNotify('TOURNAMENT_CANCELLED', () =>
      createNotification({
        userId,
        type: NOTIFICATION_TYPES.TOURNAMENT_CANCELLED,
        title: 'Giải đấu đã bị hủy',
        body: `"${tournament.title}" đã bị hủy.`,
        data: tournamentPayload(tournament, { reason }),
        sendEmail: false,
      }),
    );
  }
}

export async function notifyCaptainKicked(tournament, captainUserId) {
  await safeNotify('TOURNAMENT_KICKED', () =>
    createNotification({
      userId: Number(captainUserId),
      type: NOTIFICATION_TYPES.TOURNAMENT_KICKED,
      title: 'Đội bị loại khỏi giải',
      body: `Đội của bạn đã bị loại khỏi "${tournament.title}".`,
      data: tournamentPayload(tournament),
      sendEmail: false,
    }),
  );
}

export async function notifyTournamentUpdated(tournament, userIds) {
  const uniqueIds = [...new Set(userIds.map(Number).filter(Boolean))];
  for (const userId of uniqueIds) {
    await safeNotify('TOURNAMENT_UPDATED', () =>
      createNotification({
        userId,
        type: NOTIFICATION_TYPES.TOURNAMENT_UPDATED,
        title: 'Giải đấu đã cập nhật',
        body: `"${tournament.title}" có thông tin mới.`,
        data: tournamentPayload(tournament),
        sendEmail: false,
      }),
    );
  }
}
