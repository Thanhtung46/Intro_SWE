import { useRouter } from 'expo-router';

import { ROUTES, refereeVenueDetailRoute } from '@/constants/routes';
import RefereeBoardMapScreen from '@/screens/referee/RefereeBoardMapScreen';
import { safeBack } from '@/utils/safeBack';

// Thin route — referee job board map (mirrors app/matches/map.tsx).
export default function RefereeBoardMapRoute() {
  const router = useRouter();

  return (
    <RefereeBoardMapScreen
      onBack={() => safeBack(router, ROUTES.REFEREE_BOARD)}
      onOpenVenue={(venue) =>
        router.push(
          refereeVenueDetailRoute(venue.venueId, {
            sport: venue.sportType,
            favorited: venue.isFavorited,
          })
        )
      }
    />
  );
}
