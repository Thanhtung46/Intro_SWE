import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/spacing';
import type { ScheduleCourtRow, ScheduleSlot } from '@/types/group';

type Props = {
  courts: ScheduleCourtRow[];
};

type BookedRange = { start: string; end: string; startMinutes: number; endMinutes: number };

/** Width of one 30-minute slot — wide enough to read; day scrolls horizontally. */
const SLOT_WIDTH = 36;
const SLOT_GAP = 2;
const BAR_HEIGHT = 36;
const AXIS_HEIGHT = 32;

function toMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function toHm(totalMinutes: number): string {
  const clamped = Math.min(Math.max(totalMinutes, 0), 24 * 60);
  if (clamped === 24 * 60) return '24:00';
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatHourLabel(hour: number): string {
  if (hour === 24) return '24:00';
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Merge consecutive BOOKED slots into readable ranges. */
function mergeBookedRanges(slots: ScheduleSlot[]): BookedRange[] {
  const ranges: BookedRange[] = [];
  let rangeStart: string | null = null;
  let rangeStartMinutes = 0;
  let rangeEndMinutes = 0;

  const flush = () => {
    if (rangeStart == null) return;
    ranges.push({
      start: rangeStart,
      end: toHm(rangeEndMinutes),
      startMinutes: rangeStartMinutes,
      endMinutes: rangeEndMinutes,
    });
    rangeStart = null;
  };

  slots.forEach((slot) => {
    const startMinutes = toMinutes(slot.startsAt);
    if (slot.status === 'BOOKED') {
      if (rangeStart == null) {
        rangeStart = slot.startsAt;
        rangeStartMinutes = startMinutes;
        rangeEndMinutes = startMinutes + slot.durationMinutes;
      } else if (startMinutes === rangeEndMinutes) {
        rangeEndMinutes = startMinutes + slot.durationMinutes;
      } else {
        flush();
        rangeStart = slot.startsAt;
        rangeStartMinutes = startMinutes;
        rangeEndMinutes = startMinutes + slot.durationMinutes;
      }
    } else {
      flush();
    }
  });
  flush();

  return ranges;
}

function slotPixelWidth(durationMinutes: number): number {
  const units = Math.max(durationMinutes, 30) / 30;
  return units * SLOT_WIDTH + (units - 1) * SLOT_GAP;
}

function CourtTimeline({ court }: { court: ScheduleCourtRow }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const bookedRanges = useMemo(() => mergeBookedRanges(court.slots), [court.slots]);
  const dayStart = court.slots.length ? toMinutes(court.slots[0].startsAt) : 0;

  const contentWidth = useMemo(() => {
    if (court.slots.length === 0) return 0;
    return court.slots.reduce((sum, slot, index) => {
      return sum + slotPixelWidth(slot.durationMinutes) + (index > 0 ? SLOT_GAP : 0);
    }, 0);
  }, [court.slots]);

  /** Hour marks at every full hour, positioned in px from day start. */
  const hourMarks = useMemo(() => {
    const marks: { hour: number; left: number }[] = [];
    const last = court.slots[court.slots.length - 1];
    const dayEnd = last ? toMinutes(last.startsAt) + last.durationMinutes : 24 * 60;
    for (let hour = Math.ceil(dayStart / 60); hour * 60 <= dayEnd; hour += 1) {
      const minutesFromStart = hour * 60 - dayStart;
      const slotIndex = minutesFromStart / 30;
      const left = slotIndex * (SLOT_WIDTH + SLOT_GAP);
      marks.push({ hour, left });
    }
    return marks;
  }, [court.slots, dayStart]);

  const initialScrollX = useMemo(() => {
    if (bookedRanges.length === 0) return 0;
    const minutesFromStart = bookedRanges[0].startMinutes - dayStart;
    const slotIndex = Math.max(0, minutesFromStart / 30);
    // Nudge a bit left so the booked block isn't glued to the edge.
    return Math.max(0, slotIndex * (SLOT_WIDTH + SLOT_GAP) - SLOT_WIDTH * 2);
  }, [bookedRanges, dayStart]);

  return (
    <View style={styles.courtBlock}>
      <Text style={styles.courtName}>{court.name ?? t('groups.schedule.court')}</Text>

      {bookedRanges.length > 0 ? (
        <View style={styles.sessionList}>
          <Text style={styles.sessionHeading}>{t('groups.schedule.sessions')}</Text>
          {bookedRanges.map((range) => (
            <View key={`${range.start}-${range.end}`} style={styles.sessionRow}>
              <View style={styles.sessionAccent} />
              <Text style={styles.sessionTime}>
                {range.start} – {range.end}
              </Text>
              <Text style={styles.sessionDuration}>
                {Math.round(((range.endMinutes - range.startMinutes) / 60) * 10) / 10}h
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{t('groups.schedule.noSessions')}</Text>
      )}

      <Text style={styles.scrollHint}>{t('groups.schedule.scrollHint')}</Text>

      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => {
          if (initialScrollX > 0) {
            scrollRef.current?.scrollTo({ x: initialScrollX, animated: false });
          }
        }}
      >
        <View style={{ width: contentWidth }}>
          <View style={styles.barTrack}>
            {court.slots.map((slot, index) => (
              <View
                key={`${slot.startsAt}-${index}`}
                style={[
                  styles.cell,
                  { width: slotPixelWidth(slot.durationMinutes) },
                  slot.status === 'BOOKED' ? styles.cellBooked : styles.cellAvailable,
                ]}
              >
                {slot.status === 'BOOKED' ? (
                  <Text style={styles.cellBookedLabel} numberOfLines={1}>
                    {slot.startsAt}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          <View style={[styles.hourAxis, { width: contentWidth }]}>
            {hourMarks.map(({ hour, left }) => (
              <View key={hour} style={[styles.hourMark, { left }]}>
                <View style={styles.hourTick} />
                <Text style={styles.hourLabel}>{formatHourLabel(hour)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.cellBooked]} />
          <Text style={styles.legendText}>{t('groups.schedule.booked')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.cellAvailable]} />
          <Text style={styles.legendText}>{t('groups.schedule.available')}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Group Detail Schedule tab — large 30-min cells on a horizontally
 * scrollable day timeline, plus a clear session time summary above.
 */
export default function GroupScheduleGrid({ courts }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  if (courts.length === 0) {
    return <Text style={styles.emptyText}>{t('groups.schedule.noCourts')}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {courts.map((court) => (
        <CourtTimeline key={court.courtId} court={court} />
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { gap: spacing.lg },
  courtBlock: { gap: spacing.sm },
  courtName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  sessionList: {
    backgroundColor: colors.roleCardSelectedBg,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sessionHeading: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sessionAccent: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sessionTime: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  sessionDuration: { fontSize: 13, fontWeight: '700', color: colors.primary },

  scrollHint: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  scrollContent: { paddingVertical: 2 },

  barTrack: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    gap: SLOT_GAP,
    alignItems: 'stretch',
  },
  cell: {
    height: BAR_HEIGHT,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cellBooked: { backgroundColor: colors.primary },
  cellAvailable: {
    backgroundColor: colors.tintedSurface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cellBookedLabel: { fontSize: 9, fontWeight: '700', color: colors.white },

  hourAxis: {
    height: AXIS_HEIGHT,
    position: 'relative',
    marginTop: 4,
  },
  hourMark: {
    position: 'absolute',
    top: 0,
    width: 40,
  },
  hourTick: {
    width: 1,
    height: 8,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
    marginBottom: 2,
  },
  hourLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },

  legendRow: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: colors.textMuted },
  emptyText: { fontSize: 13, color: colors.textMuted },
});
