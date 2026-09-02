import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import type { BoardVenue } from '@/types/referee';

type Props = {
  venue: BoardVenue;
  onPress: () => void;
  onToggleFavorite: () => void;
  onDirections: () => void;
  onApply: () => void;
  applyLoading?: boolean;
};

/** Job Board venue card (Pencil "Referee Job Board" frame). Nested actions
 *  stopPropagation so favorite / directions / apply don't open detail. */
export default function BoardVenueCard({
  venue,
  onPress,
  onToggleFavorite,
  onDirections,
  onApply,
  applyLoading,
}: Props) {
  const { t } = useLanguage();

  const stop =
    (action: () => void) =>
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      action();
    };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.cover}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.coverTop}>
          <View style={styles.coverLeft}>
            <TouchableOpacity testID="board-venue-favorite" style={styles.iconBtn} onPress={stop(onToggleFavorite)}>
              <Ionicons
                name={venue.isFavorited ? 'heart' : 'heart-outline'}
                size={16}
                color={venue.isFavorited ? colors.error : colors.white}
              />
            </TouchableOpacity>
            <TouchableOpacity testID="board-venue-directions" style={styles.iconBtn} onPress={stop(onDirections)}>
              <Ionicons name="paper-plane-outline" size={15} color={colors.white} />
            </TouchableOpacity>
          </View>
          {venue.ratingCount > 0 ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color="#F5A623" />
              <Text style={styles.ratingText}>{venue.avgRating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity style={styles.applyBtn} onPress={stop(onApply)} disabled={applyLoading}>
          {applyLoading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.applyText}>{t('referee.board.apply')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {venue.name}
        </Text>
        {venue.distanceKm != null ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.bodyText} />
            <Text style={styles.meta}>{t('referee.board.kmAway').replace('{km}', venue.distanceKm.toFixed(1))}</Text>
          </View>
        ) : null}
        {venue.address ? (
          <View style={styles.metaRow}>
            <Ionicons name="map-outline" size={14} color={colors.bodyText} />
            <Text style={styles.meta} numberOfLines={1}>
              {venue.address}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: { height: 180, justifyContent: 'space-between' },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  coverLeft: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassChipBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: colors.headingText },
  applyBtn: {
    margin: spacing.md,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  body: { padding: spacing.md, gap: spacing.xs },
  name: { fontSize: 18, fontWeight: '800', color: colors.headingText },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { fontSize: 13, color: colors.bodyText, flexShrink: 1 },
});
