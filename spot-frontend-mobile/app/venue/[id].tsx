import { useLocalSearchParams, useRouter } from 'expo-router';
import VenueDetailScreen from '@/screens/venue/VenueDetailScreen';

// "/venue/[id]" — venue detail (Figma node 19:297, "Booking field - Venue
// Detail") — reached from a venue card's "Book Field" button.
export default function VenueDetailRoute() {
  const router = useRouter();
  const { id, sport } = useLocalSearchParams<{ id: string; sport?: string }>();

  return <VenueDetailScreen venueId={id} sport={sport} onBack={() => router.back()} />;
}
