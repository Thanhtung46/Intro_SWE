import { useLocalSearchParams, useRouter } from 'expo-router';
import VenueMapScreen from '@/screens/matches/VenueMapScreen';

// Thin route (.claude/rules/code-style.md). Opened from the paper-plane
// icon (MatchCard, Check Profile, Join Match Map) instead of jumping
// straight to the external Maps app.
export default function VenueMapRoute() {
  const router = useRouter();
  const { venueName, venueAddress, latitude, longitude } = useLocalSearchParams<{
    venueName: string;
    venueAddress: string;
    latitude: string;
    longitude: string;
  }>();

  return (
    <VenueMapScreen
      venueName={venueName ?? ''}
      venueAddress={venueAddress ?? ''}
      latitude={Number(latitude)}
      longitude={Number(longitude)}
      onBack={() => router.back()}
    />
  );
}
