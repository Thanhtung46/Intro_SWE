import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavBar } from '@/components/common/BottomNavBar';
import ErrorBanner from '@/components/common/ErrorBanner';
import FilterSheet from '@/components/matches/FilterSheet';
import MatchCard from '@/components/matches/MatchCard';
import { ProfileMenu } from '@/components/ProfileMenu';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage, listMatches, setFavorite } from '@/services/matchService';
import type { Match, Sport } from '@/types/match';
import { EMPTY_MATCH_FILTERS, type MatchFilters } from '@/types/matchFilters';

type SubTab = 'matches' | 'groups' | 'tournaments';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  onOpenMap: () => void;
  onOpenMatch: (matchId: number) => void;
  onHostMatch: () => void;
  onManageMatches: () => void;
};

type FabAction = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };

// Groups/Tournaments actions just show a locked message (note #1) — they
// don't route through props.onHostMatch/onManageMatches (those are reserved
// for the real Matches-tab actions once built), so the alert text always
// matches what was actually tapped.
function getFabActions(subTab: SubTab, props: Props, comingSoon: (feature: string) => void): FabAction[] {
  if (subTab === 'matches') {
    return [
      { icon: 'megaphone-outline', label: 'Host a Match', onPress: props.onHostMatch },
      { icon: 'people-outline', label: 'Manage Matches', onPress: props.onManageMatches },
    ];
  }
  if (subTab === 'groups') {
    return [
      { icon: 'add-circle-outline', label: 'Create a Group', onPress: () => comingSoon('Groups') },
      { icon: 'people-outline', label: 'Manage Groups', onPress: () => comingSoon('Groups') },
    ];
  }
  return [
    { icon: 'add-circle-outline', label: 'Create a Tournament', onPress: () => comingSoon('Tournaments') },
    { icon: 'people-outline', label: 'Manage Tournaments', onPress: () => comingSoon('Tournaments') },
  ];
}

// FAB popover position/size — tied to clearing BottomNavBar's height and
// the FAB's own 56px size, not the xs/sm/md/lg/xl content-spacing scale, so
// these stay local constants rather than spacing.ts tokens. 192 matches the
// Figma popover width (node 95:2927).
const FAB_BOTTOM_OFFSET = 96;
const FAB_MENU_BOTTOM_OFFSET = 160;
const FAB_MENU_WIDTH = 192;

// Header glass buttons (AI/notifications/avatar) and the map button read
// noticeably smaller/tighter than the reference than the xs/sm spacing
// scale gives — sized up a bit past the strict pencil-node numbers per
// user feedback comparing the rendered app against the reference image.
const HEADER_BUTTON_SIZE = 44;
const HEADER_ACTIONS_GAP = 12;
const MAP_BUTTON_SIZE = 44;

/**
 * Matches Homepage (Figma node 95:2417, SPOT-76). Presentation-only per
 * .claude/rules/code-style.md: navigation decisions (onOpenMap/onOpenMatch/
 * ...) are callback props owned by app/matches/index.tsx. ProfileMenu/
 * BottomNavBar/FilterSheet are self-contained Modal-based components (own
 * their own visibility state or router calls, like src/components/
 * ProfileMenu.tsx already does) so rendering them here isn't a routing
 * decision by this screen — Filter has no destination to navigate to.
 *
 * Groups/Tournaments sub-tab + their FAB actions are locked per the user's
 * note #1 ("Group, Tournament — chưa làm") — see SPOT-76 plan mục 2.5.
 */
export default function MatchesHomepageScreen(props: Props) {
  const [sport, setSport] = useState<Sport>('FOOTBALL');
  const [subTab, setSubTab] = useState<SubTab>('matches');
  const [searchText, setSearchText] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_MATCH_FILTERS);

  const fetchMatches = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setStatus('loading');
      try {
        const result = await listMatches({
          sport,
          location: appliedLocation || undefined,
          date: filters.date,
          timeFrom: filters.timeFrom,
          timeTo: filters.timeTo,
          skill: filters.skill.length ? filters.skill : undefined,
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          province: filters.province,
          city: filters.city,
        });
        setMatches(result.matches);
        setStatus('ready');
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
        setStatus('error');
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [sport, appliedLocation, filters]
  );

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleToggleFavorite = async (match: Match) => {
    const nextFavorited = !match.isFavorited;
    setMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: nextFavorited } : m)));
    try {
      await setFavorite(match.matchId, nextFavorited);
    } catch (err) {
      // revert on failure
      setMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: match.isFavorited } : m)));
      Alert.alert('Something went wrong', getErrorMessage(err));
    }
  };

  const handleShare = (match: Match) => {
    Share.share({ message: `${match.title} — ${match.venueName}, ${match.venueAddress}` }).catch(() => undefined);
  };

  const handleSubTabPress = (tab: SubTab) => {
    setSubTab(tab);
    if (tab !== 'matches') {
      Alert.alert('Coming soon', `${tab === 'groups' ? 'Groups' : 'Tournaments'} is not available yet.`);
    }
  };

  const comingSoon = (feature: string) => Alert.alert('Coming soon', `${feature} is not available yet.`);
  const fabActions = getFabActions(subTab, props, comingSoon);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../../../assets/Logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandText}>SPOT</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            testID="matches-ai"
            style={styles.headerGlassButton}
            onPress={() => comingSoon('AI Assistant')}
          >
            <Ionicons name="sparkles-outline" size={18} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="matches-notifications"
            style={styles.headerGlassButton}
            onPress={() => comingSoon('Notifications')}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.headingText} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="matches-avatar"
            style={[styles.headerGlassButton, styles.avatarButton]}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.avatarButtonText}>V</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sportToggle}>
        {(['FOOTBALL', 'BADMINTON'] as Sport[]).map((item) => {
          const isActive = item === sport;
          return (
            <TouchableOpacity
              key={item}
              testID={`sport-toggle-${item.toLowerCase()}`}
              style={[styles.sportButton, isActive && styles.sportButtonActive]}
              onPress={() => setSport(item)}
            >
              <Ionicons
                name={item === 'FOOTBALL' ? 'football-outline' : 'tennisball-outline'}
                size={16}
                color={isActive ? colors.white : colors.primaryDark}
              />
              <Text style={[styles.sportButtonText, isActive && styles.sportButtonTextActive]}>
                {item === 'FOOTBALL' ? 'Football' : 'Badminton'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={colors.outline} />
          <TextInput
            testID="matches-search-input"
            style={styles.searchInput}
            placeholder="Find me a 7v7 match tonight..."
            placeholderTextColor={colors.outline}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => setAppliedLocation(searchText)}
            returnKeyType="search"
          />
          <TouchableOpacity testID="matches-filter-button" onPress={() => setFilterVisible(true)} hitSlop={8}>
            <Ionicons name="options-outline" size={18} color={colors.bodyText} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity testID="matches-map-button" style={styles.mapButton} onPress={props.onOpenMap}>
          <Ionicons name="map-outline" size={18} color={colors.primaryDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.subTabs}>
        {([
          { key: 'matches', label: 'Matches' },
          { key: 'groups', label: 'Groups' },
          { key: 'tournaments', label: 'Tournaments' },
        ] as { key: SubTab; label: string }[]).map((item) => {
          const isActive = item.key === subTab;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`sub-tab-${item.key}`}
              style={[styles.subTabButton, isActive && styles.subTabButtonActive]}
              onPress={() => handleSubTabPress(item.key)}
            >
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMatches(true)} />}
      >
        {subTab !== 'matches' ? (
          <View style={styles.emptyState}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.outline} />
            <Text style={styles.emptyStateText}>
              {subTab === 'groups' ? 'Groups' : 'Tournaments'} isn't available yet.
            </Text>
          </View>
        ) : status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : status === 'error' ? (
          <ErrorBanner message={errorMessage} onRetry={() => fetchMatches()} />
        ) : matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={28} color={colors.outline} />
            <Text style={styles.emptyStateText}>No matches found. Try a different sport or search.</Text>
          </View>
        ) : (
          matches.map((match) => (
            <MatchCard
              key={match.matchId}
              match={match}
              onPress={() => props.onOpenMatch(match.matchId)}
              onToggleFavorite={() => handleToggleFavorite(match)}
              onShare={() => handleShare(match)}
            />
          ))
        )}
      </ScrollView>

      {fabOpen && (
        <View style={styles.fabMenu}>
          {fabActions.map((action, index) => (
            <React.Fragment key={action.label}>
              {index > 0 && <View style={styles.fabMenuDivider} />}
              <TouchableOpacity
                testID={`fab-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={styles.fabMenuItem}
                onPress={() => {
                  setFabOpen(false);
                  action.onPress();
                }}
              >
                <View style={styles.fabMenuIcon}>
                  <Ionicons name={action.icon} size={16} color={colors.primaryDark} />
                </View>
                <Text style={styles.fabMenuLabel}>{action.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}
      <TouchableOpacity
        testID="matches-fab"
        style={styles.fab}
        onPress={() => setFabOpen((open) => !open)}
        activeOpacity={0.85}
      >
        <Ionicons name={fabOpen ? 'close' : 'add'} size={26} color={colors.white} />
      </TouchableOpacity>

      <BottomNavBar active="matches" />
      <ProfileMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      <FilterSheet
        visible={filterVisible}
        sport={sport}
        initialFilters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 40, height: 40 },
  brandText: { fontSize: 22, fontWeight: '800', color: colors.primaryDark, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: HEADER_ACTIONS_GAP },
  // Glass circle button (AI/notifications/avatar) — pencil node 95:2417's
  // rjfUV/lxWcB/wg1Xx, sized up a bit past the pencil-node 40x40 per user
  // feedback ("bigger, more spread out" vs the rendered app).
  headerGlassButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_SIZE / 2,
    backgroundColor: colors.glassSurfaceBackground,
    borderWidth: 2,
    borderColor: colors.headerButtonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: { backgroundColor: colors.primary },
  avatarButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  sportToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    gap: 6,
  },
  sportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sportButtonActive: { backgroundColor: colors.primaryDark },
  sportButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  sportButtonTextActive: { color: colors.white },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 14, color: colors.headingText },
  // White bg + blue icon while idle, not filled blue — pencil node
  // 95:2417's sgHdE (map button next to the search bar). Sized up past
  // the pencil-node 40x40, matching the header buttons' bump.
  mapButton: {
    width: MAP_BUTTON_SIZE,
    height: MAP_BUTTON_SIZE,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.mapButtonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.iconBackground,
    gap: spacing.xxs,
  },
  subTabButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: 8 },
  subTabButtonActive: { backgroundColor: colors.primaryDark },
  subTabText: { fontSize: 12, fontWeight: '700', color: colors.outline },
  subTabTextActive: { color: colors.white },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  spinner: { marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyStateText: { fontSize: 13, color: colors.outline, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: FAB_BOTTOM_OFFSET,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  fabMenu: {
    position: 'absolute',
    right: spacing.lg,
    bottom: FAB_MENU_BOTTOM_OFFSET,
    width: FAB_MENU_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: spacing.xs,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  fabMenuDivider: { height: 1, backgroundColor: colors.iconBackground, marginHorizontal: spacing.sm },
  fabMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuLabel: { fontSize: 13, fontWeight: '700', color: colors.headingText },
});
