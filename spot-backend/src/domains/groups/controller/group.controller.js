import { parseCreateGroupDto } from '../dto/create-group.dto.js';
import { parseListGroupsQuery } from '../dto/list-groups.dto.js';
import { parseListGroupMineQuery } from '../dto/list-mine.dto.js';
import { parseMyGroupJoinRequestsQuery } from '../dto/my-join-requests.dto.js';
import { parseListGroupMembersQuery } from '../dto/list-members.dto.js';
import { parseGroupScheduleQuery } from '../dto/schedule-query.dto.js';
import {
  parseCreateGalleryImageDto,
  parseListGalleryQuery,
} from '../dto/gallery.dto.js';
import * as groupService from '../service/group.service.js';
import { SPORT_CODES } from '../../../shared/constants/sports.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';

function mergeSportFromQuery(body, query) {
  const sport = query.sport ?? body.sport;
  if (!sport) {
    throw new AppError(
      `sport is required (query ?sport= or body); one of: ${SPORT_CODES.join(', ')}`,
      400,
    );
  }
  return { ...body, sport };
}

export async function create(req, res, next) {
  try {
    const dto = parseCreateGroupDto(mergeSportFromQuery(req.body, req.query));
    const result = await groupService.createGroup(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function list(req, res, next) {
  try {
    const query = parseListGroupsQuery(req.query);
    const result = await groupService.listGroups(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const result = await groupService.getGroup(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function mine(req, res, next) {
  try {
    const query = parseListGroupMineQuery(req.query);
    const result = await groupService.listMine(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function myJoinRequests(req, res, next) {
  try {
    const query = parseMyGroupJoinRequestsQuery(req.query);
    const result = await groupService.listMyJoinRequests(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function join(req, res, next) {
  try {
    const result = await groupService.joinGroup(
      req.user.userId,
      req.params.id,
      req.body,
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function withdrawJoin(req, res, next) {
  try {
    const result = await groupService.withdrawJoinRequest(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listRequests(req, res, next) {
  try {
    const result = await groupService.listJoinRequests(
      req.user.userId,
      req.params.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function acceptRequest(req, res, next) {
  try {
    const result = await groupService.acceptJoinRequest(
      req.user.userId,
      req.params.id,
      req.params.requestId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const result = await groupService.rejectJoinRequest(
      req.user.userId,
      req.params.id,
      req.params.requestId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function kick(req, res, next) {
  try {
    const result = await groupService.kickMember(
      req.user.userId,
      req.params.id,
      req.params.userId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function transferAdmin(req, res, next) {
  try {
    const result = await groupService.transferAdmin(
      req.user.userId,
      req.params.id,
      req.params.userId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function leave(req, res, next) {
  try {
    const result = await groupService.leaveGroup(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await groupService.deleteGroup(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function favorite(req, res, next) {
  try {
    const result = await groupService.favoriteGroup(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function unfavorite(req, res, next) {
  try {
    const result = await groupService.unfavoriteGroup(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    const result = await groupService.updateGroup(
      req.user.userId,
      req.params.id,
      req.body,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function members(req, res, next) {
  try {
    const query = parseListGroupMembersQuery(req.query);
    const result = await groupService.listMembers(
      req.user.userId,
      req.params.id,
      query,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function schedule(req, res, next) {
  try {
    const query = parseGroupScheduleQuery(req.query);
    const result = await groupService.getSchedule(
      req.user.userId,
      req.params.id,
      query,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function galleryList(req, res, next) {
  try {
    const query = parseListGalleryQuery(req.query);
    const result = await groupService.listGallery(
      req.user.userId,
      req.params.id,
      query,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function galleryAdd(req, res, next) {
  try {
    const dto = parseCreateGalleryImageDto(req.body);
    const result = await groupService.addGalleryImage(
      req.user.userId,
      req.params.id,
      dto,
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function galleryRemove(req, res, next) {
  try {
    const result = await groupService.deleteGalleryImage(
      req.user.userId,
      req.params.id,
      req.params.imageId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
