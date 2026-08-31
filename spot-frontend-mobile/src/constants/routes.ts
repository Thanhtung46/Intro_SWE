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
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_OTP: '/auth/otp',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_FORGOT_PASSWORD_OTP: '/auth/forgot-password-otp',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_CHOOSE_ROLE: '/auth/choose-role',
  OWNER_REGISTER: '/owner/register',
  OWNER_WELCOME: '/owner/welcome',
  // NOTE: app/referee/register.tsx does not exist yet — this is already a
  // dead target today (ChooseRoleScreen's DESTINATION map references it).
  // Centralizing it here just makes the gap visible; not fixing the
  // referee flow itself.
  REFEREE_REGISTER: '/referee/register',
} as const;

/** Dynamic route to a venue's detail screen (app/venue/[id].tsx) — not a
 * plain string, so it can't live in ROUTES above. */
export function venueDetailRoute(id: string): string {
  return `/venue/${id}`;
}
