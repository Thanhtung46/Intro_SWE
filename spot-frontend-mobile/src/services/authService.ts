import axios, { AxiosError, AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { API_URL, USE_MOCK_API } from '../config/env';

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

const client: AxiosInstance = axios.create();

// USE_MOCK_API (src/config/env.ts) — spot-backend has no real API yet.
// Manual QA trigger convention for the register form while mocked:
//   email "taken@example.com"         -> 409, email already registered
//   email "network@example.com"       -> network error
//   email "invalid-phone@example.com" -> 400, field validation error (shape matches spot-backend's errorHandler)
//   any other email                   -> 200 success after a ~1s delay
if (USE_MOCK_API) {
  const mock = new MockAdapter(client, { delayResponse: 1000 });

  mock.onPost(`${API_URL}/auth/register`).reply((config) => {
    const body = JSON.parse(config.data) as RegisterPayload;

    if (body.email === 'taken@example.com') {
      return [409, { message: 'Email đã được sử dụng' }];
    }

    if (body.email === 'network@example.com') {
      return Promise.reject(new Error('Network Error'));
    }

    if (body.email === 'invalid-phone@example.com') {
      return [
        400,
        {
          message: 'Validation failed',
          errors: [
            { field: 'phoneNumber', message: 'Phone number must be 10–15 digits (optional leading +)' },
          ],
        },
      ];
    }

    return [200, { id: 'mock-user-id-001', email: body.email }];
  });
}

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
