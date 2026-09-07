import axios, { AxiosError, AxiosInstance } from 'axios';
// import MockAdapter from 'axios-mock-adapter';
import { API_URL } from '../config/env';
import type { CurrentUserProfile, RegisterOwnerPayload, RegisterResponse, Role } from '@/types/auth';
import { getToken } from '@/utils/authStorage';

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
  details?: { field?: string };
}

// spot-backend's DTO field names differ from this form's local field names.
const BACKEND_TO_FORM_FIELD: Record<string, string> = {
  fullName: 'name',
  phoneNumber: 'phone',
};

const DEFAULT_OTP_PURPOSE = 'REGISTER';
const OTP_MAX_ATTEMPTS = 5;

const client: AxiosInstance = axios.create();


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
      const backendField = data?.details?.field;
      const formField = backendField ? (BACKEND_TO_FORM_FIELD[backendField] || backendField) : 'email';
      return { success: false, fieldErrors: { [formField]: data?.message || 'This email is already registered' } };
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
  // For a PENDING Owner/Referee, spot-backend augments the OTP-verify
  // response with a session token + `nextStep: 'SUBMIT_VERIFICATION'` so
  // the account can submit its verification documents before login works.
  accessToken?: string;
  refreshToken?: string;
  nextStep?: string;
}

interface VerifyOtpBody {
  message?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  nextStep?: string;
}

export async function verifyOtp(
  email: string,
  otp: string,
  purpose: string = DEFAULT_OTP_PURPOSE
): Promise<VerifyOtpResult> {
  try {
    const res = await client.post<VerifyOtpBody>(`${API_URL}/auth/otp/verify`, { email, otp, purpose });
    return {
      success: true,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      nextStep: res.data.nextStep,
    };
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
  nextStep?: string;
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
  nextStep?: string;
  user: LoginUser;
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  try {
    const res = await client.post<LoginSuccessBody>(`${API_URL}/auth/login`, payload);
    return {
      success: true,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      nextStep: res.data.nextStep,
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

    // Pending Owner/Referee: covers both "documents not submitted yet" and
    // "submitted, waiting for an admin" — keep the wording neutral for both.
    if (status === 403 && data?.details?.nextStep === 'SUBMIT_VERIFICATION') {
      return {
        success: false,
        message:
          'Your account is awaiting verification. Reopen the app to finish submitting your documents, or contact support.',
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

export interface RefreshSessionResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: LoginUser;
  message?: string;
}

interface RefreshSuccessBody {
  message?: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: LoginUser;
}

/** POST /auth/refresh — used by apiClient interceptor; plain axios to avoid loops. */
export async function refreshSession(refreshToken: string): Promise<RefreshSessionResult> {
  try {
    const res = await client.post<RefreshSuccessBody>(`${API_URL}/auth/refresh`, { refreshToken });
    return {
      success: true,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      user: res.data.user,
    };
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;

    if (!error.response) {
      return { success: false, message: 'Network error. Please check your connection and try again.' };
    }

    return { success: false, message: error.response.data?.message || 'Invalid or expired refresh token.' };
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
  // For a PENDING Owner/Referee whose email is already verified (the
  // register → OTP → role flow), spot-backend returns a session token +
  // `nextStep: 'SUBMIT_VERIFICATION'` so the account can upload its
  // verification documents before login works.
  accessToken?: string;
  refreshToken?: string;
  nextStep?: string;
}

interface SelectRoleBody {
  message?: string;
  nextStep?: string;
  accessToken?: string;
  refreshToken?: string;
}

const ROLE_TO_BACKEND: Record<Role, string> = {
  player: 'PLAYER',
  owner: 'OWNER',
  referee: 'REFEREE',
};

export async function selectRole(email: string, role: Role): Promise<SelectRoleResult> {
  try {
    const res = await client.post<SelectRoleBody>(`${API_URL}/auth/role`, {
      email,
      role: ROLE_TO_BACKEND[role],
    });
    return {
      success: true,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      nextStep: res.data.nextStep,
    };
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

// registerReferee() mock removed (SPOT-93) — the referee signup now submits
// 3 verification documents via refereeService.submitRefereeVerificationBatch
// against the real POST /users/me/verification-requests/batch.

/**
 * REAL — GET /auth/me. Named in the original SPOT-76 API analysis as the
 * Join Match sheet's second dependency (its "You" card, plan mục 2.2:
 * Gender/Skill shown read-only, only Phone + Message are editable
 * per-join). `seed` is kept in the signature for call-site compatibility
 * (src/components/matches/JoinMatchSheet.tsx passes fullName/phoneNumber
 * from useUser()) but is no longer used now that this hits the real
 * endpoint — the backend response is the source of truth once signed in.
 */
export async function getMe(seed?: Pick<LoginUser, 'fullName' | 'phoneNumber'>): Promise<CurrentUserProfile> {
  void seed;
  const token = await getToken();
  try {
    // GET /auth/me responds { user: {...} }, not the profile flat at the
    // top level — unwrap it here so callers get CurrentUserProfile directly.
    const res = await client.get<{ user: CurrentUserProfile }>(`${API_URL}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data.user;
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>;
    throw new Error(error.response?.data?.message || getErrorMessage(err));
  }
}
