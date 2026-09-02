import { useLocalSearchParams, useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import RefereeVenueDetailScreen from '@/screens/referee/RefereeVenueDetailScreen';
import type { RefereeSport } from '@/types/referee';
import { safeBack } from '@/utils/safeBack';

function parseSport(raw: string | undefined): RefereeSport {
  return raw === 'Badminton' ? 'Badminton' : 'Football';
}

// Thin route — referee job-board venue detail (Apply + in-app map).
// Not player /venue/[id] (Book Field).
export default function RefereeVenueDetailRoute() {
  const router = useRouter();
  const { id, sport, favorited } = useLocalSearchParams<{
    id: string;
    sport?: string;
    favorited?: string;
  }>();

  return (
    <RefereeVenueDetailScreen
      venueId={Number(id)}
      sport={parseSport(sport)}
      initialFavorited={favorited === '1'}
      onBack={() => safeBack(router, ROUTES.REFEREE_BOARD)}
      onApplied={() => router.replace(ROUTES.REFEREE_BOARD)}
    />
  );
}
