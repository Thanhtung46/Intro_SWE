// Shared color tokens for the SPOT onboarding/role flow.
// Pulled from the Figma design ("Onboarding 1" frame) so onboarding,
// choose-role, and the owner/referee screens can reuse the same palette.
export const colors = {
  gradientStart: '#EFF6FF',
  gradientEnd: '#E0F2FE',

  primary: '#2563EB',
  primaryDark: '#004AC6',

  headingText: '#0B1C30',
  bodyText: '#434655',

  dotInactive: '#D1D5DB',
  white: '#FFFFFF',

  outline: '#737686',
  progressTrack: '#DCE9FF',
  error: '#BA1A1A',
  errorBackground: '#FDECEC',

  cardBorder: 'rgba(255, 255, 255, 0.4)',
  cardShadow: 'rgba(37, 99, 235, 0.15)',
  // Tint layered over the BlurView so it reads as white glass, not gray blur.
  cardOverlay: 'rgba(255, 255, 255, 0.35)',
  // Slightly more opaque glass tint used by the Home dashboard's cards
  // (search bar, quick actions, venue cards) — Figma node 8:2.
  glassBackground: 'rgba(255, 255, 255, 0.6)',
  ringBorder: 'rgba(37, 99, 235, 0.2)',

  auraStart: 'rgba(0, 74, 198, 0.08)',
  auraEnd: 'rgba(0, 74, 198, 0)',

  buttonShadow: 'rgba(37, 99, 235, 0.3)',

  // Choose Role / Owner / Referee screens (Figma nodes 1:565, 1:634).
  screenBackground: '#F8F9FF',
  cardBackground: 'rgba(255, 255, 255, 0.7)',
  selectedBackground: '#EFF4FF',
  iconBackground: '#EFF4FF',
  primaryDisabled: '#A9C0F5',
  primaryDisabledText: '#EEEFFF',

  // Merged in from the former src/theme/colors.ts (auth/profile/settings
  // flow) — kept as distinct keys rather than reusing same-named keys
  // above that already carry a different value (e.g. `error`,
  // `screenBackground`), so no screen's appearance shifts beyond the
  // intentional primary-blue unification.
  primarySoft: '#E7ECFB',
  text: '#1A1A1A',
  subtitle: '#6B7280',
  placeholder: '#9CA3AF',
  border: '#D1D5DB',
  formError: '#DC2626',
  formScreenBackground: '#F3F4F6',
  pink: '#EC4899',
  pinkSoft: '#FDF2F8',
  orange: '#F97316',
  orangeSoft: '#FFF7ED',
  amber: '#F59E0B',
  amberSoft: '#FFFBEB',
  success: '#16A34A',
} as const;
