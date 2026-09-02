import { useRouter } from 'expo-router';

import { RefereeShell } from '@/components/referee/RefereeShell';
import { ROUTES, refereeVenueDetailRoute } from '@/constants/routes';
import RefereeBoardScreen from '@/screens/referee/RefereeBoardScreen';

export default function RefereeBoardRoute() {
  const router = useRouter();
  return (
    <RefereeShell activeTab="board">
      <RefereeBoardScreen
        onOpenVenue={(venue) =>
          router.push(
            refereeVenueDetailRoute(venue.venueId, {
              sport: venue.sportType,
              favorited: venue.isFavorited,
            })
          )
        }
        onOpenMap={() => router.push(ROUTES.REFEREE_BOARD_MAP)}
      />
    </RefereeShell>
  );
}
