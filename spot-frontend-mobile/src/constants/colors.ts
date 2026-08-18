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

  // Matches domain (Figma nodes 95:2417, 87:1903, 100:401, ... — SPOT-76).
  glassChipBackground: 'rgba(255, 255, 255, 0.85)',
  glassSurfaceBackground: 'rgba(255, 255, 255, 0.9)',
  skillTierGreenBg: '#DCFCE7',
  skillTierGreenBorder: '#BBF7D0',
  skillTierGreenText: '#15803D',
  skillTierOrangeBg: '#FFF7ED',
  skillTierOrangeBorder: '#FED7AA',
  skillTierOrangeText: '#EA580C',
  skillTierRedBg: '#FEF2F2',
  skillTierRedBorder: '#FECACA',
  skillTierRedText: '#DC2626',
  priceText: '#059669',
  // Full-screen Modal backdrop (FilterSheet, JoinMatchSheet).
  sheetOverlay: 'rgba(11, 28, 48, 0.4)',
  // Dark scrim over a hero photo/gradient so white text stays readable
  // (Match Detail, Check Profile).
  heroScrim: 'rgba(0, 0, 0, 0.35)',
  // Translucent icon-button background sitting on top of a hero image
  // (Match Detail's back/favorite buttons, Check Profile's back button).
  glassIconButtonBackground: 'rgba(255, 255, 255, 0.2)',
  // Chip background inside JoinMatchSheet's "Required Skill Level" banner.
  skillBannerChipBackground: 'rgba(255, 255, 255, 0.6)',
  // Header's 3 glass circle buttons (AI/notifications/avatar, node 95:2417) —
  // blue-tinted ring border on top of glassSurfaceBackground's fill.
  headerButtonBorder: 'rgba(0, 74, 198, 0.3)',
  // Map button's border when not pressed (white fill + blue icon, not a
  // filled-blue button) — see SPOT-76 pencil node RzVVQ.sgHdE.
  mapButtonBorder: '#E2E8F0',
} as const;
