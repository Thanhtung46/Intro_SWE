import { AxiosError } from 'axios';

// Extracted out of matchService.ts once a second domain (groupService.ts)
// needed the exact same two helpers — see matchService.ts's own history
// comment for why apiClient (not a standalone axios instance) matters here
// too: every apiClient call already gets 401 → refresh-token → retry
// handling, this just standardizes what happens after that retry still
// fails.

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

interface ApiErrorBody {
  message?: string;
  errors?: { field?: string; message?: string }[];
}

/** Maps an AxiosError to a thrown Error with spot-backend's message when available — screens already catch + call getErrorMessage(err). */
export function throwFromAxiosError(err: unknown, fallback: string): never {
  const error = err as AxiosError<ApiErrorBody>;
  if (error?.response) {
    const body = error.response.data;
    // Zod 400s use message "Validation failed" + errors[] — surface the
    // field messages so Distance/Format issues aren't a opaque banner.
    const details = (body?.errors ?? [])
      .map((e) => e.message)
      .filter((m): m is string => Boolean(m));
    const detailText = details.length ? [...new Set(details)].join(' · ') : '';
    throw new Error(detailText || body?.message || fallback);
  }
  if (error?.request) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  throw new Error(fallback);
}
