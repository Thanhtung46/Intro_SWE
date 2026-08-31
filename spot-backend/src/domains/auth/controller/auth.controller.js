import { parseRegisterDto } from '../dto/register.dto.js';
import { parseVerifyOtpDto, parseResendOtpDto } from '../dto/otp.dto.js';
import { parseLoginDto } from '../dto/login.dto.js';
import { parseSelectRoleDto } from '../dto/role.dto.js';
import {
  parseForgotPasswordDto,
  parseResetPasswordDto,
} from '../dto/forgot-password.dto.js';
import { parseRefreshDto } from '../dto/refresh.dto.js';
import { parseUpdateMeDto } from '../dto/update-me.dto.js';
import { parseUserIdParam } from '../dto/user-id.dto.js';
import * as authService from '../service/auth.service.js';
import * as usersService from '../../users/service/users.service.js';

export async function register(req, res, next) {
  try {
    const dto = parseRegisterDto(req.body);
    const result = await authService.registerPlayer(dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const dto = parseVerifyOtpDto(req.body);
    const result = await authService.verifyOtp(dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const dto = parseResendOtpDto(req.body);
    const result = await authService.resendOtp(dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const dto = parseLoginDto(req.body);
    const result = await authService.login(dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function selectRole(req, res, next) {
  try {
    const dto = parseSelectRoleDto(req.body);
    const result = await authService.selectRole(dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const dto = parseForgotPasswordDto(req.body);
    const result = await authService.forgotPassword(dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const dto = parseResetPasswordDto(req.body);
    const result = await authService.resetPassword(dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const dto = parseRefreshDto(req.body);
    const result = await authService.refreshSession(dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res, next) {
  try {
    const result = await usersService.getMe(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getPublicProfile(req, res, next) {
  try {
    const userId = parseUserIdParam(req.params);
    const result = await authService.getPublicUserProfile(userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const dto = parseUpdateMeDto(req.body);
    const result = await authService.updateCurrentUser(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
