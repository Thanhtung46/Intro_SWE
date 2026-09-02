import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { getErrorMessage } from '@/services/apiErrors';
import { registerVenue, setVenueFavorite } from '@/services/refereeService';
import { getVenueDetail, type PublicVenue } from '@/services/venueService';
import type { RefereeSport } from '@/types/referee';
import { openVenueDirections } from '@/utils/directions';
import { showAlert } from '@/utils/showAlert';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  venueId: number;
  sport: RefereeSport;
  initialFavorited?: boolean;
  onBack: () => void;
  onApplied: () => void;
};

/**
 * Referee venue detail — mirrors MatchDetailScreen for the job board:
 * view venue + in-app directions (VenueMapScreen) + Apply to pool.
 * Not the player booking VenueDetailScreen (Book Field / Google Maps).
 */
export default function RefereeVenueDetailScreen({
  venueId,
  sport,
  initialFavorited = false,
  onBack,
  onApplied,
}: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [fieldCount, setFieldCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [applying, setApplying] = useState(false);

  const fetch = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const result = await getVenueDetail(venueId);
      if (!result.success || !result.venue) {
        throw new Error(result.message || 'Venue not found.');
      }
      setVenue(result.venue);
      setFieldCount(result.fields?.length ?? 0);
      setStatus('ready');
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
      setStatus('error');
    }
  }, [venueId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleFavorite = async () => {
    const next = !isFavorited;
    setIsFavorited(next);
    try {
      await setVenueFavorite(venueId, next);
    } catch (e) {
      setIsFavorited(!next);
      showAlert(getErrorMessage(e));
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await registerVenue(venueId, sport);
      showAlert(t('referee.board.applied'));
      onApplied();
    } catch (e) {
      showAlert(getErrorMessage(e));
    } finally {
      setApplying(false);
    }
  };

  const handleOpenMap = () => {
    if (!venue) return;
    openVenueDirections(router, {
      latitude: venue.latitude,
      longitude: venue.longitude,
      venueName: venue.name,
      venueAddress: venue.address ?? '',
    });
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (status === 'error' || !venue) {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ErrorBanner message={errorMessage || 'Venue not found.'} onRetry={fetch} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroOverlay} />
          <SafeAreaView edges={['top']} style={styles.heroTopBar}>
            <TouchableOpacity testID="referee-venue-back" style={styles.heroBtn} onPress={onBack}>
              <Ionicons name="arrow-back" size={18} color={colors.headingText} />
            </TouchableOpacity>
            <TouchableOpacity testID="referee-venue-favorite" style={styles.heroBtn} onPress={handleFavorite}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorited ? colors.error : colors.headingText}
              />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroContent}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{sport}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {venue.name}
            </Text>
          </View>
        </View>

        <View style={styles.infoStrip}>
          <InfoStrip
            icon="star"
            label={t('referee.venueDetail.rating')}
            value={venue.ratingCount > 0 ? venue.avgRating.toFixed(1) : '—'}
          />
          <InfoStrip
            icon="grid-outline"
            label={t('referee.venueDetail.pitches')}
            value={String(fieldCount)}
          />
          <InfoStrip
            icon="navigate-outline"
            label={t('referee.venueDetail.distance')}
            value={venue.distanceKm != null ? `${venue.distanceKm.toFixed(1)} km` : '—'}
          />
        </View>

        <View style={styles.body}>
          <TouchableOpacity
            testID="referee-venue-location"
            style={styles.locationCard}
            onPress={handleOpenMap}
            activeOpacity={0.85}
          >
            <View style={styles.locationIconWrap}>
              <Ionicons name="location-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationName} numberOfLines={1}>
                {venue.name}
              </Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {venue.address}
              </Text>
            </View>
            <View style={styles.mapButton}>
              <Text style={styles.mapButtonText}>{t('referee.venueDetail.map')}</Text>
            </View>
          </TouchableOpacity>

          {venue.amenities ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('referee.venueDetail.amenities')}</Text>
              <Text style={styles.sectionBody}>{venue.amenities}</Text>
            </View>
          ) : null}

          <Text style={styles.hint}>{t('referee.venueDetail.applyHint')}</Text>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          testID="referee-venue-directions"
          style={styles.secondaryBtn}
          onPress={handleOpenMap}
        >
          <Ionicons name="paper-plane-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.secondaryBtnText}>{t('referee.venueDetail.directions')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="referee-venue-apply"
          style={[styles.primaryBtn, applying && styles.primaryBtnDisabled]}
          onPress={handleApply}
          disabled={applying}
        >
          {applying ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>{t('referee.board.apply')}</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function InfoStrip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stripItem}>
      <Ionicons name={icon} size={14} color={colors.outline} />
      <Text style={styles.stripLabel}>{label}</Text>
      <Text style={styles.stripValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screenBackground },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screenBackground,
    padding: spacing.lg,
  },
  scrollContent: { paddingBottom: spacing.xl },

  hero: { height: 220, justifyContent: 'space-between' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.heroScrim },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  heroBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.stickyIconButtonBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { padding: spacing.md, gap: spacing.xs },
  sportBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.glassIconButtonBackground,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sportBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.white },

  infoStrip: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  stripItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.sm },
  stripLabel: { fontSize: 10, color: colors.outline },
  stripValue: { fontSize: 13, fontWeight: '700', color: colors.headingText },

  body: { padding: spacing.md, gap: spacing.md },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: { flex: 1 },
  locationName: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  locationAddress: { fontSize: 12, color: colors.bodyText },
  mapButton: {
    backgroundColor: colors.selectedBackground,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mapButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  section: { gap: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.headingText },
  sectionBody: { fontSize: 13, color: colors.bodyText, lineHeight: 20 },
  hint: { fontSize: 12, color: colors.outline },

  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    backgroundColor: colors.white,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: colors.white },
});
