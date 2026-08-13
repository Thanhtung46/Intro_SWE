import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

import { colors } from '@/constants/colors';

export type OnboardingBadge = {
  source: ImageSourcePropType;
  /** Full positional + size + shadow style for this badge (not a merge target). */
  style: StyleProp<ImageStyle>;
};

export type OnboardingSlideData = {
  id: string;
  image: ImageSourcePropType;
  /** Size (square) of the illustration itself. */
  imageSize: number;
  /** When set, a spinning dashed ring is drawn behind the illustration at this outer size. */
  ringOuterSize?: number;
  badges?: OnboardingBadge[];
  heading: string;
  body: string;
};

// `elevation` (Android shadow) is valid at runtime but missing from RN's
// typed `ImageStyle` — widen locally rather than dropping it.
type BadgeStyle = ImageStyle & { elevation?: number };

// Badge styles ported 1:1 from the old per-slide StyleSheets.
const groupsBadgeStyle: BadgeStyle = {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 44,
  height: 44,
  shadowColor: colors.buttonShadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 8,
  elevation: 4,
};
const cornerBadgeBase: BadgeStyle = {
  position: 'absolute',
  width: 44,
  height: 44,
  shadowColor: colors.cardShadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 8,
  elevation: 4,
};
const trendingBadgeStyle: BadgeStyle = { ...cornerBadgeBase, top: 4, right: -8 };
const flashBadgeStyle: BadgeStyle = { ...cornerBadgeBase, bottom: 16, left: -16 };

export const onboardingSlides: OnboardingSlideData[] = [
  {
    id: 'instant-booking',
    image: require('../../assets/onboarding/booking-3d.png'),
    imageSize: 220,
    heading: 'Instant Booking',
    body: 'Search and book sports venues near you\nin just 3 seconds.',
  },
  {
    id: 'connect-teammates',
    image: require('../../assets/onboarding/teammates-3d.png'),
    imageSize: 176,
    ringOuterSize: 192,
    badges: [{ source: require('../../assets/onboarding/groups-badge.png'), style: groupsBadgeStyle }],
    heading: 'Connect with Teammates',
    body: 'Find opponents and teammates that match\nyour skill level.',
  },
  {
    id: 'smart-schedule',
    image: require('../../assets/onboarding/ai-schedule-3d.png'),
    imageSize: 208,
    badges: [
      { source: require('../../assets/onboarding/trending-badge.png'), style: trendingBadgeStyle },
      { source: require('../../assets/onboarding/flash-badge.png'), style: flashBadgeStyle },
    ],
    heading: 'Smart Schedule',
    body: 'Manage your sports life and schedule\nwith AI.',
  },
];
