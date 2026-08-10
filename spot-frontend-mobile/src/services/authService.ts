import axios, { AxiosError, AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { API_URL, USE_MOCK_API } from '../config/env';

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  fieldErrors?: Record<string, string>;
  message?: string;
}

interface RegisterErrorBody {
  field?: string;
  message?: string;
}

const client: AxiosInstance = axios.create();

// USE_MOCK_API (src/config/env.ts) — spot-backend has no real API yet.
// Manual QA trigger convention for the register form while mocked:
//   email "taken@example.com"   -> 409, email already registered
//   email "network@example.com" -> network error
//   any other email             -> 200 success after a ~1s delay
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

    if (status === 400 && data?.field) {
      return { success: false, fieldErrors: { [data.field]: data.message || 'Invalid value' } };
    }

    return { success: false, message: data?.message || 'Something went wrong. Please try again.' };
  }
}
