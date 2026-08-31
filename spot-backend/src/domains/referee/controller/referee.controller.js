import {
  parseBoardQueryDto,
  parseRegisterVenueDto,
  parseCancelVenueRegistrationDto,
  parseInvitationsQueryDto,
  parseAssignmentIdParam,
  parseDeclineAssignmentDto,
  parseScheduleQueryDto,
  parseEarningsQueryDto,
  parseEarningsHistoryQueryDto,
  parseVenueIdParam,
} from '../dto/referee.dto.js';
import * as refereeService from '../service/referee.service.js';

export async function getMe(req, res, next) {
  try {
    const result = await refereeService.getRefereeMe(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getCertifications(req, res, next) {
  try {
    const result = await refereeService.getCertifications(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getBoard(req, res, next) {
  try {
    const query = parseBoardQueryDto(req.query);
    const result = await refereeService.getBoard(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function registerVenue(req, res, next) {
  try {
    const { venueId } = parseVenueIdParam(req.params);
    const dto = parseRegisterVenueDto(req.body);
    const result = await refereeService.registerVenue(req.user.userId, venueId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function cancelVenueRegistration(req, res, next) {
  try {
    const { venueId } = parseVenueIdParam(req.params);
    const dto = parseCancelVenueRegistrationDto(req.body);
    const result = await refereeService.cancelVenueRegistration(
      req.user.userId,
      venueId,
      dto,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function favoriteVenue(req, res, next) {
  try {
    const { venueId } = parseVenueIdParam(req.params);
    const result = await refereeService.favoriteVenue(req.user.userId, venueId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function unfavoriteVenue(req, res, next) {
  try {
    const { venueId } = parseVenueIdParam(req.params);
    const result = await refereeService.unfavoriteVenue(req.user.userId, venueId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listVenueRegistrations(req, res, next) {
  try {
    const result = await refereeService.listVenueRegistrations(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getInvitations(req, res, next) {
  try {
    const query = parseInvitationsQueryDto(req.query);
    const result = await refereeService.getInvitations(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getAssignment(req, res, next) {
  try {
    const { id } = parseAssignmentIdParam(req.params);
    const result = await refereeService.getAssignmentDetail(req.user.userId, id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function acceptAssignment(req, res, next) {
  try {
    const { id } = parseAssignmentIdParam(req.params);
    const result = await refereeService.acceptAssignment(req.user.userId, id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function declineAssignment(req, res, next) {
  try {
    const { id } = parseAssignmentIdParam(req.params);
    const dto = parseDeclineAssignmentDto(req.body);
    const result = await refereeService.declineAssignment(req.user.userId, id, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getSchedule(req, res, next) {
  try {
    const query = parseScheduleQueryDto(req.query);
    const result = await refereeService.getSchedule(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getEarnings(req, res, next) {
  try {
    const query = parseEarningsQueryDto(req.query);
    const result = await refereeService.getEarnings(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getEarningsHistory(req, res, next) {
  try {
    const query = parseEarningsHistoryQueryDto(req.query);
    const result = await refereeService.getEarningsHistory(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function devCompleteAssignment(req, res, next) {
  try {
    const { id } = parseAssignmentIdParam(req.params);
    const result = await refereeService.devCompleteAssignment(req.user.userId, id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
