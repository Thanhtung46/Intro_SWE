// Shared color tokens for the SPOT onboarding flow.
// Pulled from the Figma design ("Onboarding 1" frame) so slides 2-3 and the
// role-selection screen can reuse the same palette.
export const colors = {
  gradientStart: '#EFF6FF',
  gradientEnd: '#E0F2FE',

  primary: '#2563EB',
  primaryDark: '#004AC6',

  headingText: '#0B1C30',
  bodyText: '#434655',

  dotInactive: '#D1D5DB',
  white: '#FFFFFF',

  cardBorder: 'rgba(255, 255, 255, 0.4)',
  cardShadow: 'rgba(37, 99, 235, 0.15)',
  // Tint layered over the BlurView so it reads as white glass, not gray blur.
  cardOverlay: 'rgba(255, 255, 255, 0.35)',
  ringBorder: 'rgba(37, 99, 235, 0.2)',

  auraStart: 'rgba(0, 74, 198, 0.08)',
  auraEnd: 'rgba(0, 74, 198, 0)',

  buttonShadow: 'rgba(37, 99, 235, 0.3)',
};
