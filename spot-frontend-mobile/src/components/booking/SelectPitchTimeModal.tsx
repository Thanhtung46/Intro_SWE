import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { ThemeColors } from '@/constants/theme';
import { comingSoon } from '@/utils/comingSoon';
import { useLanguage } from '@/context/LanguageContext';
import { getFieldAvailability } from '@/services/venueService';
import { setCheckoutDraft } from '@/services/checkoutDraft';
import type { PaymentLineItem } from '@/screens/checkout/CheckoutScreen';
import DatePickerModal from './DatePickerModal';

export type Pitch = { fieldId: number; name: string; format: string; pricePerHour: number };

type Props = {
  visible: boolean;
  venueId: number;
  pitches: Pitch[];
  venueName: string;
  venueAddress: string;
  venueLatitude?: number | null;
  venueLongitude?: number | null;
  /** Venue opening hours as 24h integers, e.g. 6 and 23 for "06:00 - 23:00". */
  openHour: number;
  closeHour: number;
  onClose: () => void;
  /** Called after at least one slot in the multi-select was booked successfully. */
  onConfirm: () => void;
  /** Preselected date (YYYY-MM-DD) — e.g. handed off from the AI assistant
   * after a venue search (spec 007-assistant-venue-search P3). Falls back
   * to today when absent/unparseable, same as before this prop existed. */
  initialDate?: string;
  /** Preselected start time (HH:mm) — same hand-off source as
   * initialDate. Only used to scroll the grid into view; the player still
   * taps the cell themselves to actually select it (no slot is
   * pre-selected/booked on their behalf). */
  initialTimeFrom?: string;
  /** "Hire a Referee" toggle from VenueDetailScreen's Extra Services — applied
   * to every booking created in this session (fee added per line item). */
  hireReferee?: boolean;
  refereeFeeVnd?: number;
  themeColors?: ThemeColors;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SLOT_DURATION_MINUTES = 30;

function buildTimeSlots(openHour: number, closeHour: number): string[] {
  const slots: string[] = [];
  const openMinutes = openHour * 60;
  const closeMinutes = closeHour * 60;
  for (let start = openMinutes; start + SLOT_DURATION_MINUTES <= closeMinutes; start += SLOT_DURATION_MINUTES) {
    const h = Math.floor(start / 60);
    const m = start % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
}

/** Pitch & time-slot booking grid — Figma node 81:152 ("Booking field - Select Pitch & Time"). */
/** Parses a "YYYY-MM-DD" string to a local midnight Date; null if
 * missing/malformed so callers can fall back to today. */
function parseInitialDate(value?: string): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function SelectPitchTimeModal({
  visible,
  venueId,
  pitches,
  venueName,
  venueAddress,
  venueLatitude,
  venueLongitude,
  openHour,
  closeHour,
  onClose,
  onConfirm,
  hireReferee,
  refereeFeeVnd,
  initialDate,
  initialTimeFrom,
  themeColors,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const timeSlots = useMemo(() => buildTimeSlots(openHour, closeHour), [openHour, closeHour]);

  const [selectedDate, setSelectedDate] = useState<Date>(
    () => parseInitialDate(initialDate) ?? startOfToday(),
  );

  // Re-sync to the requested date each time the modal opens (e.g. the
  // assistant hand-off — spec 007-assistant-venue-search P3) rather than
  // only on first mount, since this component stays mounted across opens.
  useEffect(() => {
    if (visible) {
      const parsed = parseInitialDate(initialDate);
      if (parsed) setSelectedDate(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialDate]);

  // Scroll the grid horizontally so the requested start time is in view
  // when handed off from the assistant — the player still taps a cell
  // themselves, nothing is pre-selected on their behalf.
  const gridScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!visible || !initialTimeFrom) return;
    const timeIndex = timeSlots.indexOf(initialTimeFrom);
    if (timeIndex === -1) return;
    const id = setTimeout(() => {
      gridScrollRef.current?.scrollTo({ x: Math.max(timeIndex * CELL_WIDTH - CELL_WIDTH, 0), animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [visible, initialTimeFrom, timeSlots]);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  // "pitchIndex-timeIndex" keys — supports picking several slots and/or
  // several pitches at once, all for the currently selected date.
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [bookedCells, setBookedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible || pitches.length === 0) return;
    const date = toLocalDateString(selectedDate);

    Promise.all(
      pitches.map((pitch, pitchIndex) =>
        getFieldAvailability(venueId, pitch.fieldId, date).then((result) => {
          if (!result.success || !result.slots) return [];
          return result.slots
            .filter((slot) => !slot.available)
            .map((slot) => timeSlots.indexOf(slot.startTime))
            .filter((timeIndex) => timeIndex !== -1)
            .map((timeIndex) => `${pitchIndex}-${timeIndex}`);
        }),
      ),
    ).then((perPitchKeys) => {
      setBookedCells(new Set(perPitchKeys.flat()));
    });
  }, [visible, venueId, pitches, selectedDate, timeSlots]);

  // Selections are scoped to one date — switching dates would otherwise book
  // against the wrong date, so clear them.
  useEffect(() => {
    setSelectedCells(new Set());
  }, [selectedDate]);

  // Slots earlier than "now" on today's date would always be rejected by the
  // backend (`bookingDate/startTime must not be in the past`) — block them
  // in the grid instead of letting the user hit that error after picking
  // Confirm Payment.
  const pastTimeIndexes = useMemo(() => {
    const isToday = toLocalDateString(selectedDate) === toLocalDateString(new Date());
    if (!isToday) return new Set<number>();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const indexes = new Set<number>();
    timeSlots.forEach((slot, index) => {
      const [h, m] = slot.split(':').map(Number);
      if (h * 60 + m <= nowMinutes) indexes.add(index);
    });
    return indexes;
  }, [selectedDate, timeSlots]);

  const toggleCell = (pitchIndex: number, timeIndex: number) => {
    const key = `${pitchIndex}-${timeIndex}`;
    if (bookedCells.has(key) || pastTimeIndexes.has(timeIndex)) return;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedCells.size === 0) return;
    const bookingDate = toLocalDateString(selectedDate);

    // Group selected cells by pitch, then merge consecutive 30-min slots into
    // a single booking per contiguous run — so e.g. 21:00-21:30 + 21:30-22:00
    // + 22:00-22:30 on the same pitch becomes ONE 21:00-22:30 booking (one
    // ticket in Schedule) instead of three separate ones.
    const timeIndexesByPitch = new Map<number, number[]>();
    for (const key of selectedCells) {
      const [pitchIndexStr, timeIndexStr] = key.split('-');
      const pitchIndex = Number(pitchIndexStr);
      const timeIndex = Number(timeIndexStr);
      const list = timeIndexesByPitch.get(pitchIndex);
      if (list) list.push(timeIndex);
      else timeIndexesByPitch.set(pitchIndex, [timeIndex]);
    }

    const items: PaymentLineItem[] = [];
    for (const [pitchIndex, timeIndexes] of timeIndexesByPitch) {
      const pitch = pitches[pitchIndex];
      const sorted = [...timeIndexes].sort((a, b) => a - b);
      let rangeStart = sorted[0];
      let rangeEnd = sorted[0];
      const pushRange = () => {
        items.push({
          fieldId: pitch.fieldId,
          bookingDate,
          startTime: timeSlots[rangeStart],
          endTime: timeSlots[rangeEnd + 1] ?? `${String(closeHour).padStart(2, '0')}:00`,
          pitchName: pitch.name,
          pitchFormat: pitch.format,
          pricePerHour: pitch.pricePerHour,
          venueName,
          venueAddress,
          venueLatitude,
          venueLongitude,
          hireReferee: hireReferee || undefined,
          refereeFeeVnd: hireReferee ? refereeFeeVnd : undefined,
        });
      };
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === rangeEnd + 1) {
          rangeEnd = sorted[i];
          continue;
        }
        pushRange();
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
      pushRange();
    }

    setCheckoutDraft(items, formatDateLabel(selectedDate));
    onClose();
    router.push('/checkout');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, themeColors && { backgroundColor: themeColors.screenBackgroundAlt }]}>
        {/* Header */}
        <View style={[styles.header, themeColors && { borderBottomColor: themeColors.chromeBorder }]}>
          <View style={[styles.dragHandle, themeColors && { backgroundColor: themeColors.neutralDivider }]} />
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconButton} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('selectPitchTime.closeLabel')}>
              <Ionicons name="close" size={16} color={themeColors?.venueCardHeadingText ?? colors.headingText} />
            </TouchableOpacity>
            <Text style={[styles.title, themeColors && { color: themeColors.quickActionPrimaryIcon }]}>
              {t('selectPitchTime.title')}
            </Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => comingSoon(t('selectPitchTime.helpLabel'))}
              accessibilityRole="button"
              accessibilityLabel={t('selectPitchTime.helpLabel')}
            >
              <Ionicons name="help-circle-outline" size={20} color={themeColors?.venueCardHeadingText ?? colors.headingText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date selector — opens the full month calendar so any date, in
            any month, can be picked (not just a rolling few-week window). */}
        <TouchableOpacity
          style={[styles.dateSelector, themeColors && { backgroundColor: themeColors.roleIconBg }]}
          onPress={() => setDatePickerVisible(true)}
          accessibilityRole="button"
        >
          <Ionicons name="calendar-outline" size={18} color={themeColors?.primary ?? colors.primaryDark} />
          <Text style={[styles.dateSelectorText, themeColors && { color: themeColors.primary }]}>
            {formatDateLabel(selectedDate)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={themeColors?.primary ?? colors.primaryDark} />
        </TouchableOpacity>

        <DatePickerModal
          visible={datePickerVisible}
          initialDate={selectedDate}
          onCancel={() => setDatePickerVisible(false)}
          onConfirm={(date) => {
            setSelectedDate(date);
            setDatePickerVisible(false);
          }}
          themeColors={themeColors}
        />

        {/* Matrix */}
        <View style={[styles.matrixWrap, themeColors && { backgroundColor: themeColors.matrixBg }]}>
          <View style={styles.pitchColumn}>
            <View
              style={[
                styles.cornerCell,
                themeColors && { backgroundColor: themeColors.surface, borderColor: themeColors.inputBorder },
              ]}
            >
              <MaterialCommunityIcons
                name="soccer"
                size={18}
                color={themeColors?.quickActionPrimaryIcon ?? colors.primary}
              />
            </View>
            {pitches.map((pitch) => (
              <View
                key={pitch.name}
                style={[
                  styles.pitchCell,
                  themeColors && { backgroundColor: themeColors.surface, borderColor: themeColors.inputBorder },
                ]}
              >
                <Text style={[styles.pitchName, themeColors && { color: themeColors.venueCardHeadingText }]}>
                  {pitch.name}
                </Text>
                <Text style={[styles.pitchFormat, themeColors && { color: themeColors.mutedCellText }]}>
                  {pitch.format}
                </Text>
              </View>
            ))}
          </View>

          <ScrollView ref={gridScrollRef} horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.timeHeaderRow}>
                {timeSlots.map((time) => (
                  <View
                    key={time}
                    style={[
                      styles.timeHeaderCell,
                      themeColors && { backgroundColor: themeColors.glassButtonBg, borderColor: themeColors.inputBorder },
                    ]}
                  >
                    <Text style={[styles.timeHeaderText, themeColors && { color: themeColors.textSecondaryAlt }]}>
                      {time}
                    </Text>
                  </View>
                ))}
              </View>
              {pitches.map((pitch, pitchIndex) => (
                <View key={pitch.name} style={styles.gridRow}>
                  {timeSlots.map((_, timeIndex) => {
                    const key = `${pitchIndex}-${timeIndex}`;
                    const booked = bookedCells.has(key);
                    const past = pastTimeIndexes.has(timeIndex);
                    const selected = selectedCells.has(key);
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.gridCell,
                          themeColors && { backgroundColor: themeColors.surface, borderColor: themeColors.gridCellBorder },
                          (booked || past) && [
                            styles.gridCellBooked,
                            themeColors && { backgroundColor: themeColors.inputBorder },
                          ],
                          selected && [
                            styles.gridCellSelected,
                            themeColors && { backgroundColor: themeColors.quickActionPrimaryIcon },
                          ],
                        ]}
                        onPress={() => toggleCell(pitchIndex, timeIndex)}
                        disabled={booked || past}
                        accessibilityRole="button"
                        accessibilityLabel={`${pitch.name} ${timeSlots[timeIndex]}${booked ? ', booked' : past ? ', past' : ''}`}
                      >
                        {booked && (
                          <Text style={[styles.cellLabelBooked, themeColors && { color: themeColors.mutedCellText }]}>
                            {t('selectPitchTime.cellBooked')}
                          </Text>
                        )}
                        {selected && (
                          <>
                            <Text
                              style={[styles.cellLabelSelected, themeColors && { color: themeColors.white }]}
                            >
                              {t('selectPitchTime.cellSelected')}
                            </Text>
                            <View
                              style={[
                                styles.selectedAccent,
                                themeColors && { backgroundColor: themeColors.selectedAccentOverlay },
                              ]}
                            />
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Bottom action bar */}
        <View style={[styles.footer, themeColors && { borderTopColor: themeColors.chromeBorder }]}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              themeColors && { backgroundColor: themeColors.quickActionPrimaryIcon },
              selectedCells.size === 0 && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedCells.size === 0}
            accessibilityRole="button"
          >
            <Text style={[styles.confirmButtonText, themeColors && { color: themeColors.white }]}>
              {`${t('selectPitchTime.confirmBooking')}${selectedCells.size > 1 ? ` (${selectedCells.size})` : ''}`}
            </Text>
            <Ionicons name="calendar" size={18} color={themeColors?.white ?? colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.clearButton, themeColors && { backgroundColor: themeColors.clearButtonBg }]}
            onPress={() => setSelectedCells(new Set())}
            accessibilityRole="button"
            accessibilityLabel={t('selectPitchTime.clearSelectionLabel')}
          >
            <Ionicons name="trash-outline" size={20} color={themeColors?.primary ?? colors.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const CELL_WIDTH = 96;
const CELL_HEIGHT = 72;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: colors.screenBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#C3C6D7',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EFF4FF',
  },
  dateSelectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  matrixWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(248, 250, 252, 0.5)',
  },
  pitchColumn: {
    width: 100,
  },
  cornerCell: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  pitchCell: {
    height: CELL_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  pitchName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headingText,
  },
  pitchFormat: {
    fontSize: 10,
    fontWeight: '600',
    color: '#585F67',
    marginTop: 2,
  },
  timeHeaderRow: {
    flexDirection: 'row',
  },
  timeHeaderCell: {
    width: CELL_WIDTH,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeHeaderText: {
    fontSize: 14,
    color: colors.bodyText,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 74, 198, 0.05)',
  },
  gridCellBooked: {
    backgroundColor: '#E2E8F0',
  },
  gridCellSelected: {
    backgroundColor: colors.primary,
  },
  cellLabelBooked: {
    fontSize: 10,
    fontWeight: '600',
    color: '#585F67',
    textTransform: 'uppercase',
  },
  cellLabelSelected: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectedAccent: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    height: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontSize: 16,
    color: colors.white,
  },
  clearButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#D3E4FE',
  },
});
