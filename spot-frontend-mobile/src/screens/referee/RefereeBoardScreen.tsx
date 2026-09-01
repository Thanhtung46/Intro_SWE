import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ErrorBanner from '@/components/common/ErrorBanner';
import BoardVenueCard from '@/components/referee/BoardVenueCard';
import RefereeFilterSheet from '@/components/referee/RefereeFilterSheet';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { getErrorMessage } from '@/services/apiErrors';
import { buildBoardQuery, getRefereeBoard, getRefereeMe, registerVenue, setVenueFavorite } from '@/services/refereeService';
import type { BoardVenue, RefereeSport } from '@/types/referee';
import { EMPTY_REFEREE_BOARD_FILTERS, RefereeBoardFilters } from '@/types/refereeFilters';
import { openDirections } from '@/utils/directions';
import { showAlert } from '@/utils/showAlert';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  onOpenVenue: (venueId: number) => void;
};

export default function RefereeBoardScreen({ onOpenVenue }: Props) {
  const { t } = useLanguage();
  const [certifiedSports, setCertifiedSports] = useState<RefereeSport[] | null>(null);
  const [sport, setSport] = useState<RefereeSport | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RefereeBoardFilters>(EMPTY_REFEREE_BOARD_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [venues, setVenues] = useState<BoardVenue[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  useEffect(() => {
    getRefereeMe()
      .then((profile) => {
        setCertifiedSports(profile.certifiedSportTypes);
        setSport(profile.certifiedSportTypes[0] ?? null);
      })
      .catch((e) => {
        setCertifiedSports([]);
        setErrorMessage(getErrorMessage(e));
        setStatus('error');
      });
  }, []);

  const fetchBoard = useCallback(async () => {
    if (!sport) return;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    setErrorMessage('');
    try {
      const query = buildBoardQuery(sport, filters, { q: search });
      const result = await getRefereeBoard(query);
      setVenues(result.venues);
      setStatus('ready');
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
      setStatus('error');
    }
  }, [sport, filters, search]);

  useEffect(() => {
    const id = setTimeout(fetchBoard, search ? 350 : 0);
    return () => clearTimeout(id);
  }, [fetchBoard, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBoard();
    setRefreshing(false);
  };

  const handleFavorite = async (venue: BoardVenue) => {
    const next = !venue.isFavorited;
    setVenues((prev) => prev.map((v) => (v.venueId === venue.venueId ? { ...v, isFavorited: next } : v)));
    try {
      await setVenueFavorite(venue.venueId, next);
    } catch (e) {
      setVenues((prev) => prev.map((v) => (v.venueId === venue.venueId ? { ...v, isFavorited: !next } : v)));
      showAlert(getErrorMessage(e));
    }
  };

  const handleApply = async (venue: BoardVenue) => {
    if (!sport) return;
    setApplyingId(venue.venueId);
    try {
      await registerVenue(venue.venueId, sport);
      setVenues((prev) => prev.filter((v) => v.venueId !== venue.venueId));
      showAlert(t('referee.board.applied'));
    } catch (e) {
      showAlert(getErrorMessage(e));
    } finally {
      setApplyingId(null);
    }
  };

  const sportTabs = useMemo(() => certifiedSports ?? [], [certifiedSports]);

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.subtitle} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('referee.board.searchPlaceholder')}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.mapBtn} onPress={() => showAlert(t('referee.board.mapComingSoon'))}>
          <Ionicons name="map-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {sportTabs.length > 1 ? (
        <View style={styles.sportRow}>
          {sportTabs.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sportPill, sport === s && styles.sportPillActive]}
              onPress={() => setSport(s)}
            >
              <Text style={[styles.sportPillText, sport === s && styles.sportPillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {certifiedSports != null && certifiedSports.length === 0 ? (
          <Text style={styles.empty}>{t('referee.board.noCerts')}</Text>
        ) : null}
        {status === 'loading' ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null}
        {status === 'error' ? <ErrorBanner message={errorMessage} onRetry={fetchBoard} /> : null}
        {status === 'ready' && venues.length === 0 ? <Text style={styles.empty}>{t('referee.board.empty')}</Text> : null}
        {status === 'ready'
          ? venues.map((venue) => (
              <BoardVenueCard
                key={venue.venueId}
                venue={venue}
                onPress={() => onOpenVenue(venue.venueId)}
                onToggleFavorite={() => handleFavorite(venue)}
                onDirections={() =>
                  openDirections({
                    latitude: venue.latitude ?? null,
                    longitude: venue.longitude ?? null,
                    venueName: venue.name,
                    venueAddress: venue.address ?? '',
                  })
                }
                onApply={() => handleApply(venue)}
                applyLoading={applyingId === venue.venueId}
              />
            ))
          : null}
      </ScrollView>

      <RefereeFilterSheet
        visible={filterVisible}
        initialFilters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBackground },
  searchRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  mapBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sportPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sportPillText: { fontSize: 13, fontWeight: '700', color: colors.subtitle },
  sportPillTextActive: { color: colors.white },
  list: { padding: spacing.md, paddingTop: 0, gap: spacing.md },
  loader: { marginTop: spacing.xl },
  empty: { fontSize: 14, color: colors.subtitle, paddingVertical: spacing.lg, textAlign: 'center' },
});
