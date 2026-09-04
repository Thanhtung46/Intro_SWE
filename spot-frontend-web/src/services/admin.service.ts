import apiClient from './api.client'
import type {
  AdminUserRow,
  AuditLogRow,
  DashboardSummaryResponse,
  ListApprovalsParams,
  ListAuditLogParams,
  ListUsersParams,
  PaginatedResponse,
  SystemSettings,
  UpdateSettingsPayload,
  UpdateUserPayload,
  VerificationRequestRow,
} from '@/types/admin'

export async function getDashboardSummary(
  registrationDays?: number,
  role?: string
): Promise<DashboardSummaryResponse> {
  const { data } = await apiClient.get('/admin/dashboard/summary', {
    params: { registrationDays, role },
  })
  return data
}

export async function listApprovals(
  params: ListApprovalsParams
): Promise<PaginatedResponse<VerificationRequestRow>> {
  const { data } = await apiClient.get('/admin/approvals', { params })
  return data
}

export async function getApproval(id: number): Promise<{ request: VerificationRequestRow }> {
  const { data } = await apiClient.get(`/admin/approvals/${id}`)
  return data
}

export async function approveRequest(id: number) {
  const { data } = await apiClient.post(`/admin/approvals/${id}/approve`)
  return data
}

export async function rejectRequest(id: number, reason?: string) {
  const { data } = await apiClient.post(`/admin/approvals/${id}/reject`, { reason })
  return data
}

export async function listUsers(
  params: ListUsersParams
): Promise<PaginatedResponse<AdminUserRow>> {
  const { data } = await apiClient.get('/admin/users', { params })
  return data
}

export async function getUser(id: number): Promise<{ user: AdminUserRow }> {
  const { data } = await apiClient.get(`/admin/users/${id}`)
  return data
}

export async function updateUser(id: number, payload: UpdateUserPayload) {
  const { data } = await apiClient.patch(`/admin/users/${id}`, payload)
  return data
}

export async function getSettings(): Promise<{ settings: SystemSettings }> {
  const { data } = await apiClient.get('/admin/settings')
  return data
}

export async function updateSettings(payload: UpdateSettingsPayload) {
  const { data } = await apiClient.patch('/admin/settings', payload)
  return data
}

export async function listAuditLog(
  params: ListAuditLogParams
): Promise<PaginatedResponse<AuditLogRow>> {
  const { data } = await apiClient.get('/admin/audit-log', { params })
  return data
}
