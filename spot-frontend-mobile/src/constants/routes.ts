// Centralized route paths for expo-router navigation — avoids the same
// path string being hand-typed at every router.push/replace call site.
export const ROUTES = {
  HOME: '/home',
  BOOKING: '/booking',
  BOOKING_MAP: '/booking/map',
  MATCHES: '/matches',
  SCHEDULE: '/schedule',
  SETTINGS: '/settings',
  ONBOARDING: '/onboarding',
  PENDING: '/pending',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  ASSISTANT: '/assistant',
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_OTP: '/auth/otp',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_FORGOT_PASSWORD_OTP: '/auth/forgot-password-otp',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_CHOOSE_ROLE: '/auth/choose-role',
  OWNER_REGISTER: '/owner/register',
  OWNER_WELCOME: '/owner/welcome',
  // Referee flow (SPOT-93). Onboarding: choose-role → OTP → REFEREE_REGISTER
  // (3-doc upload) → REFEREE_PENDING → admin approves → login →
  // REFEREE_ACTIVATED → REFEREE_INVITATIONS. The 5 tab destinations mirror
  // the player AppShell tabs but live under app/referee/* with their own
  // RefereeShell bottom bar.
  REFEREE_REGISTER: '/referee/register',
  REFEREE_PENDING: '/referee/pending',
  REFEREE_ACTIVATED: '/referee/activated',
  REFEREE_INVITATIONS: '/referee/invitations',
  REFEREE_BOARD: '/referee/board',
  REFEREE_BOARD_MAP: '/referee/map',
  REFEREE_SCHEDULE: '/referee/schedule',
  REFEREE_EARNINGS: '/referee/earnings',
  REFEREE_SETTINGS: '/referee/settings',
  REFEREE_PROFILE: '/referee/profile',
} as const;

/** Dynamic route to a venue's detail screen (app/venue/[id].tsx) — not a
 * plain string, so it can't live in ROUTES above. */
export function venueDetailRoute(id: string): string {
  return `/venue/${id}`;
}

/** Referee job-board venue detail (Apply + in-app directions). */
export function refereeVenueDetailRoute(
  venueId: number | string,
  opts: { sport: string; favorited?: boolean } = { sport: 'Football' }
): { pathname: '/referee/venues/[id]'; params: { id: string; sport: string; favorited?: string } } {
  return {
    pathname: '/referee/venues/[id]',
    params: {
      id: String(venueId),
      sport: opts.sport,
      ...(opts.favorited ? { favorited: '1' } : {}),
    },
  };
}

/** Dynamic route to a referee assignment detail (app/referee/assignments/[id].tsx). */
export function refereeAssignmentRoute(id: number | string): string {
  return `/referee/assignments/${id}`;
}
