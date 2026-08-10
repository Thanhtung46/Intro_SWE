import { parseRegisterDto } from '../dto/register.dto.js';
import { parseVerifyOtpDto, parseResendOtpDto } from '../dto/otp.dto.js';
import { parseLoginDto } from '../dto/login.dto.js';
import { parseSelectRoleDto } from '../dto/role.dto.js';
import * as authService from '../service/auth.service.js';

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
