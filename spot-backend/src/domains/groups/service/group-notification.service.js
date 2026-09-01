import logger from '../../../shared/utils/logger.js';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';
import { createNotification } from '../../notification/service/notification.service.js';

function groupPayload(group, extra = {}) {
  return {
    groupId: Number(group.group_id),
    groupName: group.name,
    sport: group.sport,
    ...extra,
  };
}

async function safeNotify(step, fn) {
  try {
    await fn();
  } catch (err) {
    logger.warn(`Group notification failed: ${step}`, {
      error: err.message,
    });
  }
}

export async function notifyAdminJoinRequest(group, joiner, request) {
  await safeNotify('GROUP_JOIN_REQUEST', () =>
    createNotification({
      userId: Number(group.admin_user_id),
      type: NOTIFICATION_TYPES.GROUP_JOIN_REQUEST,
      title: 'Yêu cầu tham gia hội',
      body: `${joiner.full_name ?? 'Một thành viên'} muốn tham gia "${group.name}".`,
      data: groupPayload(group, {
        requestId: Number(request.request_id),
        userId: Number(joiner.user_id),
      }),
      sendEmail: false,
    }),
  );
}

export async function notifyJoinerApproved(group, joinerUserId) {
  await safeNotify('GROUP_APPROVED', () =>
    createNotification({
      userId: Number(joinerUserId),
      type: NOTIFICATION_TYPES.GROUP_APPROVED,
      title: 'Đã tham gia hội',
      body: `Bạn đã được chấp nhận vào hội "${group.name}".`,
      data: groupPayload(group),
      sendEmail: false,
    }),
  );
}

export async function notifyJoinerRejected(group, joinerUserId) {
  await safeNotify('GROUP_REJECTED', () =>
    createNotification({
      userId: Number(joinerUserId),
      type: NOTIFICATION_TYPES.GROUP_REJECTED,
      title: 'Yêu cầu tham gia bị từ chối',
      body: `Admin đã từ chối yêu cầu tham gia hội "${group.name}".`,
      data: groupPayload(group),
      sendEmail: false,
    }),
  );
}

export async function notifyMemberKicked(group, targetUserId) {
  await safeNotify('GROUP_KICKED', () =>
    createNotification({
      userId: Number(targetUserId),
      type: NOTIFICATION_TYPES.GROUP_KICKED,
      title: 'Bạn đã bị mời ra khỏi hội',
      body: `Admin đã xóa bạn khỏi hội "${group.name}".`,
      data: groupPayload(group),
      sendEmail: false,
    }),
  );
}

export async function notifyAdminTransferred(group, newAdminUserId, previousAdminUserId) {
  await safeNotify('GROUP_ADMIN_TRANSFERRED', () =>
    createNotification({
      userId: Number(newAdminUserId),
      type: NOTIFICATION_TYPES.GROUP_ADMIN_TRANSFERRED,
      title: 'Bạn là admin hội mới',
      body: `Quyền admin hội "${group.name}" đã được chuyển cho bạn.`,
      data: groupPayload(group, {
        previousAdminUserId: Number(previousAdminUserId),
      }),
      sendEmail: false,
    }),
  );
}

export async function notifyJoinersApproved(group, joinerUserIds) {
  const uniqueIds = [...new Set(joinerUserIds.map(Number).filter(Boolean))];
  for (const userId of uniqueIds) {
    await notifyJoinerApproved(group, userId);
  }
}
