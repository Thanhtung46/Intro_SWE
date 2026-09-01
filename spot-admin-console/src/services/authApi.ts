import type { AxiosError } from 'axios'
import { apiClient } from './apiClient'
import type { Role } from '../types/auth'

function networkOrMessage(err: unknown, fallback: string): string {
  const error = err as AxiosError<{ message?: string; errors?: { message?: string }[] }>
  if (!error.response) return 'Network error. Please check your connection and try again.'
  const data = error.response.data
  if (Array.isArray(data?.errors) && data.errors[0]?.message) return data.errors[0].message
  return data?.message || fallback
}

export interface RegisterPayload {
  fullName: string
  email: string
  phoneNumber?: string
  gender?: 'male' | 'female'
  password: string
  confirmPassword: string
}

export interface ApiResult {
  success: boolean
  message?: string
  attemptsRemaining?: number
}

export async function register(payload: RegisterPayload): Promise<ApiResult> {
  try {
    await apiClient.post('/auth/register', payload)
    return { success: true }
  } catch (err) {
    return { success: false, message: networkOrMessage(err, 'Could not create the account.') }
  }
}

const ROLE_TO_BACKEND: Record<Role, string> = {
  player: 'PLAYER',
  owner: 'OWNER',
  referee: 'REFEREE',
}

export async function selectRole(email: string, role: Role): Promise<ApiResult> {
  try {
    await apiClient.post('/auth/role', { email, role: ROLE_TO_BACKEND[role] })
    return { success: true }
  } catch (err) {
    return { success: false, message: networkOrMessage(err, 'Could not set your role.') }
  }
}

export async function verifyOtp(email: string, otp: string, purpose = 'REGISTER'): Promise<ApiResult> {
  try {
    await apiClient.post('/auth/otp/verify', { email, otp, purpose })
    return { success: true }
  } catch (err) {
    const error = err as AxiosError<{ message?: string; details?: { attemptsRemaining?: number } }>
    return {
      success: false,
      message: networkOrMessage(err, 'Invalid or expired OTP.'),
      attemptsRemaining: error.response?.data?.details?.attemptsRemaining,
    }
  }
}

export interface ResendOtpResult extends ApiResult {
  resendAvailableInSeconds?: number
}

export async function resendOtp(email: string, purpose = 'REGISTER'): Promise<ResendOtpResult> {
  try {
    const { data } = await apiClient.post<{ resendAvailableInSeconds?: number }>('/auth/otp/resend', {
      email,
      purpose,
    })
    return { success: true, resendAvailableInSeconds: data.resendAvailableInSeconds }
  } catch (err) {
    return { success: false, message: networkOrMessage(err, 'Could not resend the code.') }
  }
}

export async function forgotPassword(email: string): Promise<ApiResult> {
  try {
    const { data } = await apiClient.post<{ message?: string }>('/auth/forgot-password', { email })
    return { success: true, message: data.message }
  } catch (err) {
    return { success: false, message: networkOrMessage(err, 'Could not send the reset code.') }
  }
}

export interface ResetPasswordPayload {
  email: string
  otp: string
  newPassword: string
  confirmPassword: string
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ApiResult> {
  try {
    await apiClient.post('/auth/reset-password', payload)
    return { success: true }
  } catch (err) {
    const error = err as AxiosError<{ message?: string; details?: { attemptsRemaining?: number } }>
    return {
      success: false,
      message: networkOrMessage(err, 'Could not reset the password.'),
      attemptsRemaining: error.response?.data?.details?.attemptsRemaining,
    }
  }
}

export interface LoginUser {
  userId: string
  email: string
  fullName: string
  role: string
  status: string
  avatarUrl?: string | null
}

export interface LoginResult {
  success: boolean
  message?: string
  accessToken?: string
  user?: LoginUser
}

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const { data } = await apiClient.post<{ accessToken: string; user: LoginUser }>('/auth/login', {
      email,
      password,
    })
    return { success: true, accessToken: data.accessToken, user: data.user }
  } catch (err) {
    return { success: false, message: networkOrMessage(err, 'Invalid email or password.') }
  }
}
