import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { ScheduleCourtRow } from '@/types/group';

type Props = {
  courts: ScheduleCourtRow[];
};

const CELL_WIDTH = 10;
const CELL_HEIGHT = 20;

// Merges consecutive BOOKED 30-min slots into readable "HH:mm–HH:mm" ranges
// for the text list under each court's bar — 48 individual cell labels
// would be unreadable at this width.
function mergeBookedRanges(slots: ScheduleCourtRow['slots']): string[] {
  const ranges: string[] = [];
  let rangeStart: string | null = null;
  let rangeEndMinutes = 0;

  function toMinutes(hm: string): number {
    const [h, m] = hm.split(':').map(Number);
    return h * 60 + m;
  }
  function toHm(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  slots.forEach((slot, index) => {
    const startMinutes = toMinutes(slot.startsAt);
    if (slot.status === 'BOOKED') {
      if (rangeStart == null) {
        rangeStart = slot.startsAt;
        rangeEndMinutes = startMinutes + slot.durationMinutes;
      } else if (startMinutes === rangeEndMinutes) {
        rangeEndMinutes = startMinutes + slot.durationMinutes;
      } else {
        ranges.push(`${rangeStart}–${toHm(rangeEndMinutes)}`);
        rangeStart = slot.startsAt;
        rangeEndMinutes = startMinutes + slot.durationMinutes;
      }
    }
    const isLast = index === slots.length - 1;
    if ((slot.status !== 'BOOKED' || isLast) && rangeStart != null) {
      ranges.push(`${rangeStart}–${toHm(rangeEndMinutes)}`);
      rangeStart = null;
    }
  });

  return ranges;
}

/**
 * Group Detail Schedule tab grid — one court row per court, each a
 * horizontal 48×30-min-slot bar (BOOKED/AVAILABLE coloring) plus a merged
 * text list of booked ranges underneath for readability (Groups
 * implementation plan — no Matches equivalent, matches don't have a
 * recurring-slot visualization). Pure visualization, no booking action —
 * see spot-backend's "no real bookings" contract note.
 */
export default function GroupScheduleGrid({ courts }: Props) {
  if (courts.length === 0) {
    return <Text style={styles.emptyText}>No courts configured for this group.</Text>;
  }

  return (
    <View style={styles.wrap}>
      {courts.map((court) => {
        const bookedRanges = mergeBookedRanges(court.slots);
        return (
          <View key={court.courtId} style={styles.courtBlock}>
            <Text style={styles.courtName}>{court.name ?? 'Court'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.barRow}>
                {court.slots.map((slot, index) => (
                  <View
                    key={index}
                    style={[styles.cell, slot.status === 'BOOKED' ? styles.cellBooked : styles.cellAvailable]}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.cellBooked]} />
                <Text style={styles.legendText}>Booked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.cellAvailable]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
            </View>
            {bookedRanges.length > 0 ? (
              <View style={styles.rangeChips}>
                {bookedRanges.map((range, index) => (
                  <View key={index} style={styles.rangeChip}>
                    <Text style={styles.rangeChipText}>{range}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No sessions this day.</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  courtBlock: { gap: spacing.xs },
  courtName: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  barRow: { flexDirection: 'row', gap: 1 },
  cell: { width: CELL_WIDTH, height: CELL_HEIGHT, borderRadius: 2 },
  cellBooked: { backgroundColor: colors.primaryDark },
  cellAvailable: { backgroundColor: colors.iconBackground },
  legendRow: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: colors.outline },
  rangeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
  rangeChip: { backgroundColor: colors.selectedBackground, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  rangeChipText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  emptyText: { fontSize: 12, color: colors.outline },
});
