import { useLocalSearchParams, useRouter } from 'expo-router';
import VenueMapScreen from '@/screens/common/VenueMapScreen';

// Thin route (.claude/rules/code-style.md). Shared venue map — opened from
// the paper-plane icon (MatchCard, Check Profile, Join Match Map) and from
// the venue mini-map on Match / Group / Tournament detail, instead of
// jumping straight to the external Maps app; always, even when there's no
// lat/lng (VenueMapScreen falls back to a text-only view; see
// src/utils/directions.ts).
export default function VenueMapRoute() {
  const router = useRouter();
  const { venueName, venueAddress, latitude, longitude } = useLocalSearchParams<{
    venueName: string;
    venueAddress: string;
    latitude?: string;
    longitude?: string;
  }>();
  const lat = latitude ? Number(latitude) : NaN;
  const lng = longitude ? Number(longitude) : NaN;

  return (
    <VenueMapScreen
      venueName={venueName ?? ''}
      venueAddress={venueAddress ?? ''}
      latitude={Number.isFinite(lat) ? lat : null}
      longitude={Number.isFinite(lng) ? lng : null}
      onBack={() => router.back()}
    />
  );
}
