import type {
  RegisterOwnerPayload,
  RegisterRefereePayload,
  RegisterResponse,
  Role,
} from '@/types/auth';

/**
 * MOCK service — no network calls yet (per plan: "mock first, wire real API
 * later"). Every screen must call through here, never call axios directly
 * (see .claude/rules/api-conventions.md).
 *
 * Real `spot-backend` today exposes `POST /auth/register` + `POST /auth/role`
 * (see spot-backend/src/domains/auth/routes.js) — not the `/register-owner`
 * / `/register-referee` names the tickets describe. Reconcile the payload
 * shape/endpoint names with whoever owns spot-backend when wiring this for
 * real; the function signatures here are written to stay stable across
 * that swap.
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

export async function selectRole(role: Role): Promise<void> {
  await delay(MOCK_DELAY_MS);
  // No-op mock: role choice isn't persisted server-side yet, navigation
  // alone drives the next screen.
  void role;
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
