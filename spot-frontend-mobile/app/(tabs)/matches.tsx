import { useRouter } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import MatchesHomepageScreen from '@/screens/matches/MatchesHomepageScreen';

// Thin route (.claude/rules/code-style.md) — owns navigation decisions,
// MatchesHomepageScreen owns the UI. Header/bottom nav/ProfileMenu/
// NotificationMenu now live in AppShell (shared with Home/Schedule/
// Settings), same as app/home/index.tsx. Filters are handled internally by
// the screen (self-contained Modal — no destination to route to). Groups
// sub-tab callbacks (Groups implementation plan) mirror the Matches ones.
export default function MatchesHomepageRoute() {
  const router = useRouter();

  return (
    <AppShell>
      <MatchesHomepageScreen
        onOpenMap={(tab) => {
          if (tab === 'groups') return router.push('/groups/map');
          if (tab === 'tournaments') return router.push('/tournaments/map');
          return router.push('/matches/map');
        }}
        onOpenMatch={(matchId) => router.push(`/matches/${matchId}`)}
        onJoinMatch={(matchId) =>
          router.push({ pathname: '/matches/[id]', params: { id: String(matchId), join: '1' } })
        }
        onHostMatch={(sport) => router.push({ pathname: '/matches/host-form', params: { sport } })}
        onManageMatches={() => router.push('/matches/mine')}
        onOpenGroup={(groupId) => router.push(`/groups/${groupId}`)}
        onCreateGroup={(sport) => router.push({ pathname: '/groups/create', params: { sport } })}
        onManageGroups={() => router.push('/groups/mine')}
        onOpenTournament={(tournamentId) => router.push(`/tournaments/${tournamentId}`)}
        onJoinTournament={(tournamentId) => router.push(`/tournaments/${tournamentId}/join`)}
        onCreateTournament={(sport) => router.push({ pathname: '/tournaments/create', params: { sport } })}
        onManageTournaments={() => router.push('/tournaments/mine')}
      />
    </AppShell>
  );
}
