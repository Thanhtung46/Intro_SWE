export type AdminRole = 'PLAYER' | 'OWNER' | 'REFEREE' | 'ADMIN'
export type AssignableRole = 'PLAYER' | 'OWNER' | 'REFEREE'
export type UserStatus = 'ACTIVE' | 'PENDING' | 'LOCKED'
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type VerificationRole = 'OWNER' | 'REFEREE'

export interface VerificationApplicant {
  userId: number
  email: string
  phoneNumber: string | null
  role: AdminRole
  status: UserStatus
  fullName: string | null
}

export interface VerificationRequestRow {
  verificationReqId: number
  userId: number
  requestType: string
  documentUrl: string
  status: VerificationStatus
  adminNotes: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  createdAt: string
  applicant?: VerificationApplicant
}

export interface AdminUserRow {
  userId: number
  email: string
  phoneNumber: string | null
  role: AdminRole
  status: UserStatus
  fullName: string | null
  gender: string | null
  avatarUrl: string | null
  emailVerifiedAt: string | null
  roleSelectedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AuditLogRow {
  auditId: number
  adminUserId: number
  action: string
  targetType: string
  targetId: string
  payload: Record<string, unknown> | null
  createdAt: string
  adminEmail: string | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface DashboardSummary {
  totalUsers: number
  pendingApprovals: number
  revenueTotal: number
  revenueCurrency: string
  revenueBreakdown: {
    bookings: number
    matchmaking: number
  }
  revenueSource: string
}

export interface DashboardRegistrationPoint {
  day: string
  count: number
}

export interface DashboardSummaryResponse {
  summary: DashboardSummary
  userRegistrations: DashboardRegistrationPoint[]
}

export interface PaymentGatewaySettings {
  momo: { enabled: boolean }
  vnpay: { enabled: boolean }
}

export interface SystemSettings {
  commissionRatePercent: number
  paymentGateways: PaymentGatewaySettings
  otpExpirySeconds: number
  defaultCancellationWindowHours: number
  updatedAt: string | null
}

export interface ListApprovalsParams {
  status?: VerificationStatus
  role?: VerificationRole
  limit?: number
  offset?: number
}

export interface ListUsersParams {
  role?: AdminRole
  status?: UserStatus
  q?: string
  limit?: number
  offset?: number
}

export interface UpdateUserPayload {
  role?: AssignableRole
  status?: UserStatus
}

export interface UpdateSettingsPayload {
  commissionRatePercent?: number
  paymentGateways?: Partial<PaymentGatewaySettings>
  otpExpirySeconds?: number
  defaultCancellationWindowHours?: number
}

export interface ListAuditLogParams {
  limit?: number
  offset?: number
}
