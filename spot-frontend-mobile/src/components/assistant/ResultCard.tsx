import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { MatchResult, VenueResult } from '@/services/assistantService';
import { formatVnd } from '@/utils/format';

type Props =
  | { variant: 'match'; result: MatchResult; onPress: () => void }
  | { variant: 'venue'; result: VenueResult; onPress: () => void };

function formatStartsAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

/**
 * Shared kèo/venue result card shown inline in the assistant chat (spec
 * FR-001/FR-002) — same "glass card" shell VenueCard/MatchCard already use,
 * so both result kinds read as one visual system without drifting apart
 * (see spot-frontend-mobile/specs/001-assistant-chat-ui-redesign/research.md
 * decision 3).
 */
export default function ResultCard(props: Props) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);

  if (props.variant === 'match') {
    const { result, onPress } = props;
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button" activeOpacity={0.85}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {result.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={themeColors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
            {result.venueName}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={themeColors.textSecondary} />
          <Text style={styles.metaText}>{formatStartsAt(result.startsAt)}</Text>
          <View style={styles.spotsBadge}>
            <Ionicons name="people-outline" size={11} color={themeColors.accentText} />
            <Text style={styles.spotsText}>{result.spotsLeft} chỗ trống</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const { result, onPress } = props;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button" activeOpacity={0.85}>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {result.venueName}
      </Text>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color={themeColors.textSecondary} />
        <Text style={styles.metaText} numberOfLines={2} ellipsizeMode="tail">
          {result.address}
        </Text>
      </View>
      {result.priceFromPerHour != null ? (
        <Text style={styles.price}>Từ {formatVnd(result.priceFromPerHour)}/giờ</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      backgroundColor: c.glassCardBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
    },
    spotsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.glassButtonBg,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    spotsText: {
      fontSize: 10,
      fontWeight: '600',
      color: c.accentText,
    },
    price: {
      fontSize: 14,
      fontWeight: '800',
      color: c.matchPriceValueText,
    },
  });
}
