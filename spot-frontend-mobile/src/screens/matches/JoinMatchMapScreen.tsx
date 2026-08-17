import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavBar } from '@/components/common/BottomNavBar';
import ErrorBanner from '@/components/common/ErrorBanner';
import MatchCard from '@/components/matches/MatchCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage, listMatches, setFavorite } from '@/services/matchService';
import type { Match, Sport } from '@/types/match';

type Status = 'loading' | 'ready' | 'error';
type Category = 'ALL' | Sport;

type Props = {
  onBack: () => void;
  onOpenMatch: (matchId: number) => void;
};

/**
 * Join Match - Map (Figma node 426:2, SPOT-76 task #6). List-fallback per
 * user's choice — no map library installed (react-native-maps/expo-location/
 * react-native-webview are all missing, and react-native-maps needs
 * `expo prebuild`/a dev client, so introducing it wasn't worth it for this
 * ticket). Keeps the search/category header from Figma, swaps the map
 * viewport for the same match-list rendering used everywhere else, with an
 * explicit "coming soon" banner so it reads as a deliberate interim state.
 */
export default function JoinMatchMapScreen({ onBack, onOpenMatch }: Props) {
  const [category, setCategory] = useState<Category>('ALL');
  const [searchText, setSearchText] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const fetchMatches = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await listMatches({
        sport: category === 'ALL' ? undefined : category,
        location: appliedLocation || undefined,
      });
      setMatches(result.matches);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [category, appliedLocation]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleToggleFavorite = async (match: Match) => {
    const nextFavorited = !match.isFavorited;
    setMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: nextFavorited } : m)));
    try {
      await setFavorite(match.matchId, nextFavorited);
    } catch {
      setMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: match.isFavorited } : m)));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="join-map-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={colors.outline} />
          <TextInput
            testID="join-map-search-input"
            style={styles.searchInput}
            placeholder="Search sports, venues..."
            placeholderTextColor={colors.outline}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => setAppliedLocation(searchText)}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.categoryRow}>
        {([
          { key: 'ALL', label: 'All' },
          { key: 'FOOTBALL', label: 'Football' },
          { key: 'BADMINTON', label: 'Badminton' },
        ] as { key: Category; label: string }[]).map((item) => {
          const isActive = item.key === category;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`join-map-category-${item.key.toLowerCase()}`}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setCategory(item.key)}
            >
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!bannerDismissed && (
        <View style={styles.banner}>
          <Ionicons name="map-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.bannerText}>Map view is coming soon — showing matches as a list for now.</Text>
          <TouchableOpacity testID="join-map-dismiss-banner" onPress={() => setBannerDismissed(true)}>
            <Ionicons name="close" size={16} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : status === 'error' ? (
          <ErrorBanner message={errorMessage} onRetry={fetchMatches} />
        ) : matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={28} color={colors.outline} />
            <Text style={styles.emptyStateText}>No matches found nearby.</Text>
          </View>
        ) : (
          matches.map((match) => (
            <MatchCard
              key={match.matchId}
              match={match}
              onPress={() => onOpenMatch(match.matchId)}
              onToggleFavorite={() => handleToggleFavorite(match)}
              onShare={() => undefined}
            />
          ))
        )}
      </ScrollView>

      <BottomNavBar active="matches" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 14, color: colors.headingText },

  categoryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  categoryChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  categoryChipText: { fontSize: 13, fontWeight: '700', color: colors.headingText },
  categoryChipTextActive: { color: colors.white },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.selectedBackground,
    borderRadius: 12,
    padding: spacing.sm,
  },
  bannerText: { flex: 1, fontSize: 12, color: colors.primaryDark },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  spinner: { marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyStateText: { fontSize: 13, color: colors.outline, textAlign: 'center' },
});
