import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import MatchesHomepageScreen from '@/screens/matches/MatchesHomepageScreen';

// Thin route (.claude/rules/code-style.md) — owns navigation decisions,
// MatchesHomepageScreen owns the UI. Filters are handled internally by the
// screen (self-contained Modal, like ProfileMenu — no destination to route
// to). "Coming soon" placeholder below points at the "Host a Match" form,
// which isn't one of the original 6 Figma screens (SPOT-76 plan mục 4).
export default function MatchesHomepageRoute() {
  const router = useRouter();
  const comingSoon = (feature: string) => Alert.alert('Coming soon', `${feature} is not available yet.`);

  return (
    <MatchesHomepageScreen
      onOpenMap={() => router.push('/matches/map')}
      onOpenMatch={(matchId) => router.push(`/matches/${matchId}`)}
      onHostMatch={() => comingSoon('Hosting a match')}
      onManageMatches={() => router.push('/matches/mine')}
    />
  );
}
