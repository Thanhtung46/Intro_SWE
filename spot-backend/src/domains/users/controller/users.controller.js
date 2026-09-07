import { parseUpdateProfileDto } from '../dto/update-profile.dto.js';
import { parseUpdatePreferencesDto } from '../dto/update-preferences.dto.js';
import {
  parseRequestEmailChangeDto,
  parseConfirmEmailChangeDto,
} from '../dto/change-email.dto.js';
import {
  parseRequestPhoneChangeDto,
  parseConfirmPhoneChangeDto,
} from '../dto/change-phone.dto.js';
import { parseChangePasswordDto } from '../dto/change-password.dto.js';
import {
  parseListScheduleDto,
  parseSeedScheduleDto,
} from '../dto/schedule.dto.js';
import * as usersService from '../service/users.service.js';
import * as adminService from '../../admin/service/admin.service.js';
import { parseSubmitVerificationDto } from '../dto/submit-verification.dto.js';
import {
  parseSubmitVerificationBatchDto,
  parseSubmitCertUpdateDto,
} from '../dto/submit-verification-batch.dto.js';

export async function me(req, res, next) {
  try {
    const result = await usersService.getMe(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getMainProfile(req, res, next) {
  try {
    const result = await usersService.getMainProfile(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const dto = parseUpdateProfileDto(req.body);
    const result = await usersService.patchMe(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getPreferences(req, res, next) {
  try {
    const result = await usersService.getPreferences(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const dto = parseUpdatePreferencesDto(req.body);
    const result = await usersService.patchPreferences(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const dto = parseChangePasswordDto(req.body);
    const result = await usersService.changePassword(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function uploadAvatar(req, res, next) {
  try {
    const result = await usersService.uploadAvatar(req.user.userId, req.file);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function uploadVerificationDocument(req, res, next) {
  try {
    const result = await adminService.uploadVerificationDocument(
      req.user.userId,
      req.file,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function submitVerificationRequest(req, res, next) {
  try {
    const dto = parseSubmitVerificationDto(req.body);
    const result = await adminService.submitVerificationRequest(
      req.user.userId,
      dto,
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function submitVerificationBatch(req, res, next) {
  try {
    const dto = parseSubmitVerificationBatchDto(req.body);
    const result = await adminService.submitVerificationBatch(
      req.user.userId,
      dto,
    );
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listMyVerificationRequests(req, res, next) {
  try {
    const result = await adminService.listMyVerificationRequests(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function submitCertUpdate(req, res, next) {
  try {
    const dto = parseSubmitCertUpdateDto(req.body);
    const result = await adminService.submitCertUpdate(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function requestEmailChange(req, res, next) {
  try {
    const dto = parseRequestEmailChangeDto(req.body);
    const result = await usersService.requestEmailChange(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function confirmEmailChange(req, res, next) {
  try {
    const dto = parseConfirmEmailChangeDto(req.body);
    const result = await usersService.confirmEmailChange(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function requestPhoneChange(req, res, next) {
  try {
    const dto = parseRequestPhoneChangeDto(req.body);
    const result = await usersService.requestPhoneChange(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function confirmPhoneChange(req, res, next) {
  try {
    const dto = parseConfirmPhoneChangeDto(req.body);
    const result = await usersService.confirmPhoneChange(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getMySchedule(req, res, next) {
  try {
    const query = parseListScheduleDto(req.query);
    const result = await usersService.getMySchedule(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function seedMySchedule(req, res, next) {
  try {
    const dto = parseSeedScheduleDto(req.body);
    const result = await usersService.seedMySchedule(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}
