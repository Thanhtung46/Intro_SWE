import { parseListApprovalsDto, parseApprovalIdParam, parseRejectApprovalDto } from '../dto/list-approvals.dto.js';
import { parseListUsersDto, parseAdminUserIdParam, parseUpdateUserDto } from '../dto/list-users.dto.js';
import { parseUpdateSettingsDto } from '../dto/update-settings.dto.js';
import { parseDashboardQueryDto, parseListAuditLogDto } from '../dto/dashboard-query.dto.js';
import * as adminService from '../service/admin.service.js';

export async function dashboardSummary(req, res, next) {
  try {
    const query = parseDashboardQueryDto(req.query);
    const result = await adminService.getDashboardSummary(query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listApprovals(req, res, next) {
  try {
    const query = parseListApprovalsDto(req.query);
    const result = await adminService.listApprovals(query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getApproval(req, res, next) {
  try {
    const { id } = parseApprovalIdParam(req.params);
    const result = await adminService.getApprovalDetail(id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function approveApproval(req, res, next) {
  try {
    const { id } = parseApprovalIdParam(req.params);
    const result = await adminService.approveRequest(req.user.userId, id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function rejectApproval(req, res, next) {
  try {
    const { id } = parseApprovalIdParam(req.params);
    const dto = parseRejectApprovalDto(req.body);
    const result = await adminService.rejectRequest(req.user.userId, id, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    const query = parseListUsersDto(req.query);
    const result = await adminService.listUsers(query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getUser(req, res, next) {
  try {
    const { id } = parseAdminUserIdParam(req.params);
    const result = await adminService.getUserDetail(id);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function patchUser(req, res, next) {
  try {
    const { id } = parseAdminUserIdParam(req.params);
    const dto = parseUpdateUserDto(req.body);
    const result = await adminService.updateUser(req.user.userId, id, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getSettings(req, res, next) {
  try {
    const result = await adminService.getSettings();
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function patchSettings(req, res, next) {
  try {
    const dto = parseUpdateSettingsDto(req.body);
    const result = await adminService.patchSettings(req.user.userId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listAuditLog(req, res, next) {
  try {
    const query = parseListAuditLogDto(req.query);
    const result = await adminService.listAuditLog(query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
