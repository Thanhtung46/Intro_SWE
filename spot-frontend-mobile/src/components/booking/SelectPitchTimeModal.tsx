import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';

export type Pitch = { name: string; format: string };

export type PitchTimeSelection = { pitchName: string; date: Date; time: string };

type Props = {
  visible: boolean;
  pitches: Pitch[];
  /** Venue opening hours as 24h integers, e.g. 6 and 23 for "06:00 - 23:00". */
  openHour: number;
  closeHour: number;
  onClose: () => void;
  onConfirm: (selection: PitchTimeSelection) => void;
};

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_COUNT = 7;
// Fixed mock "booked" cells (pitch index-time index) so the grid isn't
// always empty — matches the Figma mock's Pitch A / first two slots.
const BOOKED_CELLS = new Set(['0-0', '0-1']);

function buildDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: DAY_COUNT }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
}

function buildTimeSlots(openHour: number, closeHour: number): string[] {
  const slots: string[] = [];
  for (let h = openHour; h < closeHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

/** Pitch & time-slot booking grid — Figma node 81:152 ("Booking field - Select Pitch & Time"). */
export default function SelectPitchTimeModal({ visible, pitches, openHour, closeHour, onClose, onConfirm }: Props) {
  const days = useMemo(() => buildDays(), []);
  const timeSlots = useMemo(() => buildTimeSlots(openHour, closeHour), [openHour, closeHour]);

  const [dayIndex, setDayIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ pitchIndex: number; timeIndex: number } | null>(null);

  const toggleCell = (pitchIndex: number, timeIndex: number) => {
    const key = `${pitchIndex}-${timeIndex}`;
    if (BOOKED_CELLS.has(key)) return;
    setSelectedCell((prev) =>
      prev && prev.pitchIndex === pitchIndex && prev.timeIndex === timeIndex ? null : { pitchIndex, timeIndex },
    );
  };

  const handleConfirm = () => {
    if (!selectedCell) return;
    comingSoon('Confirm booking');
    onConfirm({
      pitchName: pitches[selectedCell.pitchIndex].name,
      date: days[dayIndex],
      time: timeSlots[selectedCell.timeIndex],
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={16} color={colors.headingText} />
            </TouchableOpacity>
            <Text style={styles.title}>Select Pitch & Time</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => comingSoon('Help')}
              accessibilityRole="button"
              accessibilityLabel="Help"
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.headingText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStrip}
        >
          {days.map((date, index) => {
            const active = index === dayIndex;
            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[styles.dateChip, active && styles.dateChipActive]}
                onPress={() => setDayIndex(index)}
                accessibilityRole="button"
              >
                <Text style={[styles.dateWeekday, active && styles.dateTextActive]}>
                  {WEEKDAY_LABELS[date.getDay()]}
                </Text>
                <Text style={[styles.dateNumber, active && styles.dateTextActive]}>
                  {String(date.getDate()).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Matrix */}
        <View style={styles.matrixWrap}>
          <View style={styles.pitchColumn}>
            <View style={styles.cornerCell}>
              <MaterialCommunityIcons name="soccer" size={18} color={colors.primary} />
            </View>
            {pitches.map((pitch) => (
              <View key={pitch.name} style={styles.pitchCell}>
                <Text style={styles.pitchName}>{pitch.name}</Text>
                <Text style={styles.pitchFormat}>{pitch.format}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.timeHeaderRow}>
                {timeSlots.map((time) => (
                  <View key={time} style={styles.timeHeaderCell}>
                    <Text style={styles.timeHeaderText}>{time}</Text>
                  </View>
                ))}
              </View>
              {pitches.map((pitch, pitchIndex) => (
                <View key={pitch.name} style={styles.gridRow}>
                  {timeSlots.map((_, timeIndex) => {
                    const key = `${pitchIndex}-${timeIndex}`;
                    const booked = BOOKED_CELLS.has(key);
                    const selected = selectedCell?.pitchIndex === pitchIndex && selectedCell?.timeIndex === timeIndex;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.gridCell, booked && styles.gridCellBooked, selected && styles.gridCellSelected]}
                        onPress={() => toggleCell(pitchIndex, timeIndex)}
                        disabled={booked}
                        accessibilityRole="button"
                        accessibilityLabel={`${pitch.name} ${timeSlots[timeIndex]}${booked ? ', booked' : ''}`}
                      >
                        {booked && <Text style={styles.cellLabelBooked}>BOOKED</Text>}
                        {selected && (
                          <>
                            <Text style={styles.cellLabelSelected}>SELECTED</Text>
                            <View style={styles.selectedAccent} />
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
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, !selectedCell && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!selectedCell}
            accessibilityRole="button"
          >
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            <Ionicons name="calendar" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSelectedCell(null)}
            accessibilityRole="button"
            accessibilityLabel="Clear selection"
          >
            <Ionicons name="trash-outline" size={20} color={colors.primaryDark} />
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
  dateStrip: {
    gap: 8,
    padding: 16,
  },
  dateChip: {
    minWidth: 64,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#EFF4FF',
    paddingHorizontal: 14,
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 4,
  },
  dateWeekday: {
    fontSize: 16,
    color: colors.bodyText,
    opacity: 0.7,
  },
  dateNumber: {
    fontSize: 16,
    color: colors.bodyText,
    marginTop: 2,
  },
  dateTextActive: {
    color: colors.white,
    opacity: 1,
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
