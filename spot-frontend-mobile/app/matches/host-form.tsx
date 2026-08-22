import { useLocalSearchParams, useRouter } from 'expo-router';
import HostMatchScreen from '@/screens/matches/HostMatchScreen';
import type { Sport } from '@/types/match';

// Thin route (.claude/rules/code-style.md). Named "host-form" rather than
// "host/new" to avoid colliding with app/matches/host/[id].tsx (Check
// Profile's dynamic route) — expo-router would otherwise have to
// disambiguate "host/new" against "host/[id]" as a param value.
export default function HostMatchFormRoute() {
  const router = useRouter();
  const { sport } = useLocalSearchParams<{ sport?: string }>();

  return (
    <HostMatchScreen
      sport={(sport === 'BADMINTON' ? 'BADMINTON' : 'FOOTBALL') as Sport}
      onBack={() => router.back()}
      onCreated={() => router.replace('/matches/mine')}
    />
  );
}
