import axios, { AxiosError, AxiosInstance } from 'axios';
// import MockAdapter from 'axios-mock-adapter';
import { API_URL, USE_MOCK_API } from '../config/env';
import type { RegisterOwnerPayload, RegisterRefereePayload, RegisterResponse, Role } from '@/types/auth';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  gender?: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResult {
  success: boolean;
  fieldErrors?: Record<string, string>;
  message?: string;
}

interface RegisterFieldError {
  field?: string;
  message?: string;
}

interface RegisterErrorBody {
  message?: string;
  errors?: RegisterFieldError[];
}

// spot-backend's DTO field names differ from this form's local field names.
const BACKEND_TO_FORM_FIELD: Record<string, string> = {
  fullName: 'name',
  phoneNumber: 'phone',
};

const DEFAULT_OTP_PURPOSE = 'REGISTER';
const OTP_MAX_ATTEMPTS = 5;

const client: AxiosInstance = axios.create();

// USE_MOCK_API (src/config/env.ts) — spot-backend has no real API yet.
// Manual QA trigger convention for the register form while mocked:
//   email "taken@example.com"         -> 409, email already registered
//   email "network@example.com"       -> network error
//   email "invalid-phone@example.com" -> 400, field validation error (shape matches spot-backend's errorHandler)
//   any other email                   -> 200 success after a ~1s delay
//
// Manual QA trigger convention for the OTP screen while mocked:
//   otp "111111"               -> verify always succeeds
//   otp "000000"               -> verify always fails (400, attemptsRemaining counts down per call, then 429)
//   email "locked@example.com" -> verify/resend returns 429 immediately (out of attempts already)
//   resend                     -> always succeeds and resets the mocked attempt counter for that email
//
// Manual QA trigger convention for the Login screen while mocked:
//   password "wrongpass"            -> 401, invalid credentials
//   email "locked@example.com"      -> 403, account permanently locked
//   email "pending@example.com"     -> 403, account pending approval
//   email "noselectrole@example.com"-> 403, role not selected yet (SELECT_ROLE)
//   any other email/password        -> 200 success with a fake JWT + user object
//
// Manual QA trigger convention for the Forgot/Reset Password screens while mocked:
//   forgotPassword -> always 200 with the same generic message (matches real anti-enumeration behavior)
//   otp "111111"   -> reset always succeeds
//   otp anything else -> reset always fails (400, attemptsRemaining counts down per call, then 429)
// if (USE_MOCK_API) {
//   const mock = new MockAdapter(client, { delayResponse: 1000 });
//   const mockOtpAttempts = new Map<string, number>();
//   const mockResetAttempts = new Map<string, number>();

//   mock.onPost(`${API_URL}/auth/register`).reply((config) => {
//     const body = JSON.parse(config.data) as RegisterPayload;

//     if (body.email === 'taken@example.com') {
//       return [409, { message: 'Email đã được sử dụng' }];
//     }

//     if (body.email === 'network@example.com') {
//       return Promise.reject(new Error('Network Error'));
//     }

//     if (body.email === 'invalid-phone@example.com') {
//       return [
//         400,
//         {
//           message: 'Validation failed',
//           errors: [
//             { field: 'phoneNumber', message: 'Phone number must be 10–15 digits (optional leading +)' },
//           ],
//         },
//       ];
//     }

//     return [200, { id: 'mock-user-id-001', email: body.email }];
//   });

//   mock.onPost(`${API_URL}/auth/otp/verify`).reply((config) => {
//     const body = JSON.parse(config.data) as { email: string; otp: string };

//     if (body.email === 'locked@example.com') {
//       return [429, { message: 'Too many invalid OTP attempts. Please request a new code.' }];
//     }

//     if (body.otp === '111111') {
//       return [200, { message: 'Email verified successfully', email: body.email }];
//     }

//     if (body.otp === '000000') {
//       const attempts = (mockOtpAttempts.get(body.email) || 0) + 1;
//       mockOtpAttempts.set(body.email, attempts);
//       const attemptsRemaining = OTP_MAX_ATTEMPTS - attempts;

//       if (attemptsRemaining <= 0) {
//         return [429, { message: 'Too many invalid OTP attempts. Please request a new code.' }];
//       }
//       return [400, { message: 'Invalid OTP', details: { attemptsRemaining } }];
//     }

//     return [400, { message: 'OTP expired or not found. Please request a new code.' }];
//   });

//   mock.onPost(`${API_URL}/auth/otp/resend`).reply((config) => {
//     const body = JSON.parse(config.data) as { email: string };
//     mockOtpAttempts.delete(body.email);

//     return [
//       200,
//       { message: 'A new OTP has been sent to your email', email: body.email, resendAvailableInSeconds: 60 },
//     ];
//   });

//   mock.onPost(`${API_URL}/auth/login`).reply((config) => {
//     const body = JSON.parse(config.data) as { email: string; password: string };

//     if (body.email === 'locked@example.com') {
//       return [403, { message: 'Account is locked. Please contact support.' }];
//     }

//     if (body.email === 'pending@example.com') {
//       return [403, { message: 'Account is pending approval and cannot log in yet.' }];
//     }

//     if (body.email === 'noselectrole@example.com') {
//       return [
//         403,
//         { message: 'Please select your role to continue.', details: { nextStep: 'SELECT_ROLE' } },
//       ];
//     }

//     if (body.password === 'wrongpass') {
//       return [401, { message: 'Invalid email or password', details: { attemptsRemaining: 4 } }];
//     }

//     return [
//       200,
//       {
//         message: 'Login successful',
//         accessToken: 'mock-access-token',
//         refreshToken: 'mock-refresh-token',
//         tokenType: 'Bearer',
//         expiresIn: 900,
//         user: {
//           userId: 'mock-user-id-001',
//           email: body.email,
//           fullName: 'Mock User',
//           role: 'PLAYER',
//           status: 'ACTIVE',
//           roleSelected: true,
//           emailVerified: true,
//         },
//       },
//     ];
//   });

//   mock.onPost(`${API_URL}/auth/forgot-password`).reply(() => {
//     return [200, { message: 'If an account exists for this email, an OTP has been sent.' }];
//   });

//   mock.onPost(`${API_URL}/auth/reset-password`).reply((config) => {
//     const body = JSON.parse(config.data) as { email: string; otp: string };

//     if (body.otp === '111111') {
//       mockResetAttempts.delete(body.email);
//       return [200, { message: 'Password has been reset successfully. You can now log in.', email: body.email }];
//     }

//     const attempts = (mockResetAttempts.get(body.email) || 0) + 1;
//     mockResetAttempts.set(body.email, attempts);
//     const attemptsRemaining = OTP_MAX_ATTEMPTS - attempts;

//     if (attemptsRemaining <= 0) {
//       return [429, { message: 'Too many invalid OTP attempts. Please request a new code.' }];
//     }
//     return [400, { message: 'Invalid or expired OTP', details: { attemptsRemaining } }];
//   });
// }

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  try {
    await client.post(`${API_URL}/auth/register`, payload);
    return { success: true };
  } catch (err) {
    const error = err as AxiosError<RegisterErrorBody>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    const { status, data } = error.response;

    if (status === 409) {
      return { success: false, fieldErrors: { email: data?.message || 'This email is already registered' } };
    }

    if (status === 400 && Array.isArray(data?.errors)) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of data.errors) {
        if (!issue.field) continue;
        const field = BACKEND_TO_FORM_FIELD[issue.field] || issue.field;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message || 'Invalid value';
        }
      }
      return { success: false, fieldErrors };
    }

    return { success: false, message: data?.message || 'Something went wrong. Please try again.' };
  }
}

interface OtpFieldError {
  field?: string;
  message?: string;
}

interface OtpErrorBody {
  message?: string;
  errors?: OtpFieldError[];
  details?: { attemptsRemaining?: number };
}

export interface VerifyOtpResult {
  success: boolean;
  message?: string;
  attemptsRemaining?: number;
  rateLimited?: boolean;
}

export async function verifyOtp(
  email: string,
  otp: string,
  purpose: string = DEFAULT_OTP_PURPOSE
): Promise<VerifyOtpResult> {
  try {
    await client.post(`${API_URL}/auth/otp/verify`, { email, otp, purpose });
    return { success: true };
  } catch (err) {
    const error = err as AxiosError<OtpErrorBody>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    const { status, data } = error.response;

    if (status === 429) {
      return {
        success: false,
        rateLimited: true,
        message: data?.message || 'Too many attempts. Please request a new code.',
      };
    }

    if (status === 400 && Array.isArray(data?.errors)) {
      return { success: false, message: data.errors[0]?.message || 'Invalid OTP.' };
    }

    if (status === 400) {
      return {
        success: false,
        message: data?.message || 'Invalid or expired OTP.',
        attemptsRemaining: data?.details?.attemptsRemaining,
      };
    }

    return { success: false, message: data?.message || 'Something went wrong. Please try again.' };
  }
}

export interface ResendOtpResult {
  success: boolean;
  message?: string;
  resendAvailableInSeconds?: number;
}

interface ResendOtpBody {
  message?: string;
  email?: string;
  resendAvailableInSeconds?: number;
}

export async function resendOtp(
  email: string,
  purpose: string = DEFAULT_OTP_PURPOSE
): Promise<ResendOtpResult> {
  try {
    const res = await client.post<ResendOtpBody>(`${API_URL}/auth/otp/resend`, { email, purpose });
    return { success: true, resendAvailableInSeconds: res.data.resendAvailableInSeconds };
  } catch (err) {
    const error = err as AxiosError<OtpErrorBody>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}

export interface ForgotPasswordResult {
  success: boolean;
  message?: string;
}

interface ForgotPasswordErrorBody {
  message?: string;
  errors?: { field?: string; message?: string }[];
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  try {
    const res = await client.post<{ message?: string }>(`${API_URL}/auth/forgot-password`, { email });
    return { success: true, message: res.data.message };
  } catch (err) {
    const error = err as AxiosError<ForgotPasswordErrorBody>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    const { data } = error.response;

    if (Array.isArray(data?.errors)) {
      return { success: false, message: data.errors[0]?.message || 'Invalid email.' };
    }

    return { success: false, message: data?.message || 'Something went wrong. Please try again.' };
  }
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message?: string;
  attemptsRemaining?: number;
  rateLimited?: boolean;
}

interface ResetPasswordErrorBody {
  message?: string;
  errors?: { field?: string; message?: string }[];
  details?: { attemptsRemaining?: number };
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResult> {
  try {
    const res = await client.post<{ message?: string }>(`${API_URL}/auth/reset-password`, payload);
    return { success: true, message: res.data.message };
  } catch (err) {
    const error = err as AxiosError<ResetPasswordErrorBody>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    const { status, data } = error.response;

    if (status === 429) {
      return {
        success: false,
        rateLimited: true,
        message: data?.message || 'Too many attempts. Please request a new code.',
      };
    }

    if (status === 400 && Array.isArray(data?.errors)) {
      return { success: false, message: data.errors[0]?.message || 'Invalid request.' };
    }

    if (status === 400) {
      return {
        success: false,
        message: data?.message || 'Invalid or expired OTP',
        attemptsRemaining: data?.details?.attemptsRemaining,
      };
    }

    return { success: false, message: data?.message || 'Something went wrong. Please try again.' };
  }
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginUser {
  userId?: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  role?: string;
  status?: string;
  roleSelected?: boolean;
  emailVerified?: boolean;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  attemptsRemaining?: number;
  accessToken?: string;
  refreshToken?: string;
  user?: LoginUser;
}

interface LoginErrorBody {
  message?: string;
  errors?: { field?: string; message?: string }[];
  details?: { attemptsRemaining?: number; lockoutUntil?: string; nextStep?: string };
}

interface LoginSuccessBody {
  message?: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: LoginUser;
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  try {
    const res = await client.post<LoginSuccessBody>(`${API_URL}/auth/login`, payload);
    return {
      success: true,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      user: res.data.user,
    };
  } catch (err) {
    const error = err as AxiosError<LoginErrorBody>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    const { status, data } = error.response;

    if (status === 400 && Array.isArray(data?.errors)) {
      return { success: false, message: data.errors[0]?.message || 'Invalid email or password.' };
    }

    // "Not selected a role yet" is a setup gap, not a system error — show a friendly message
    // instead of relaying the backend's technical wording (no "Choose role" screen exists yet).
    if (status === 403 && data?.details?.nextStep === 'SELECT_ROLE') {
      return {
        success: false,
        message: 'Please finish setting up your account before logging in.',
      };
    }

    if (status === 401) {
      return {
        success: false,
        message: data?.message || 'Invalid email or password',
        attemptsRemaining: data?.details?.attemptsRemaining,
      };
    }

    return { success: false, message: data?.message || 'Something went wrong. Please try again.' };
  }
}

/**
 * MOCK — Owner/Referee registration and role selection have no real
 * `spot-backend` endpoint yet (per plan: "mock first, wire real API
 * later"). Real `spot-backend` today exposes `POST /auth/register` +
 * `POST /auth/role` (see spot-backend/src/domains/auth/routes.js) — not the
 * `/register-owner` / `/register-referee` names the tickets describe.
 * Reconcile the payload shape/endpoint names with whoever owns
 * spot-backend when wiring this for real; the function signatures here
 * are written to stay stable across that swap.
 */

const MOCK_DELAY_MS = 700;

// Dev-only: typing this exact value into a form's first text field forces
// the mock to reject, so the error/retry UI is exercised without a real
// backend. Remove this switch once real API calls replace the mocks below.
const FORCE_ERROR_VALUE = 'fail';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export interface SelectRoleResult {
  success: boolean;
  message?: string;
}

const ROLE_TO_BACKEND: Record<Role, string> = {
  player: 'PLAYER',
  owner: 'OWNER',
  referee: 'REFEREE',
};

export async function selectRole(email: string, role: Role): Promise<SelectRoleResult> {
  try {
    await client.post(`${API_URL}/auth/role`, { email, role: ROLE_TO_BACKEND[role] });
    return { success: true };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return { success: false, message: error.response.data?.message || 'Something went wrong. Please try again.' };
  }
}

export async function registerOwner(payload: RegisterOwnerPayload): Promise<RegisterResponse> {
  await delay(MOCK_DELAY_MS);
  if (payload.venueName.trim().toLowerCase() === FORCE_ERROR_VALUE) {
    throw new Error("Couldn't submit registration. Check your network and try again.");
  }
  return { status: 'pending' };
}

export async function registerReferee(payload: RegisterRefereePayload): Promise<RegisterResponse> {
  await delay(MOCK_DELAY_MS);
  if (payload.fullName.trim().toLowerCase() === FORCE_ERROR_VALUE) {
    throw new Error("Couldn't submit registration. Check your network and try again.");
  }
  return { status: 'pending' };
}
