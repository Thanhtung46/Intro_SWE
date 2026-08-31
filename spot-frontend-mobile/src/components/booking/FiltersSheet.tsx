import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemeColors } from '@/constants/theme';
import { comingSoon } from '@/utils/comingSoon';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import RangeSlider from '@/components/booking/RangeSlider';
import DatePickerModal from '@/components/booking/DatePickerModal';

type LocationMode = 'location' | 'distance';

const DEFAULT_PRICE: [number, number] = [20, 150];
const DEFAULT_DISTANCE: [number, number] = [1, 20];

function formatDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Booking Field search filters — Figma node 72:239 ("Book field - Filter 1"). */
export default function FiltersSheet({ visible, onClose }: Props) {
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [mode, setMode] = useState<LocationMode>('location');
  const [price, setPrice] = useState<[number, number]>(DEFAULT_PRICE);
  const [distance, setDistance] = useState<[number, number]>(DEFAULT_DISTANCE);
  const [date, setDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const reset = () => {
    setMode('location');
    setPrice(DEFAULT_PRICE);
    setDistance(DEFAULT_DISTANCE);
    setDate(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('filters.title')}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('filters.closeLabel')}
          >
            <Ionicons name="close" size={18} color={c.venueCardHeadingText} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('filters.dateSection')}</Text>
            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => setDatePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('filters.datePlaceholder')}
            >
              <Text style={date ? styles.fieldValue : styles.fieldPlaceholder}>
                {date ? formatDate(date) : t('filters.datePlaceholder')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={c.textSecondaryAlt} />
            </TouchableOpacity>
          </View>

          {/* Time Range */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('filters.timeRangeSection')}</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>{t('filters.fromLabel')}</Text>
                <TouchableOpacity
                  style={styles.fieldRow}
                  onPress={() => comingSoon('Time picker')}
                  accessibilityRole="button"
                  accessibilityLabel="Select start time"
                >
                  <Text style={styles.fieldPlaceholder}>{t('filters.timePlaceholder')}</Text>
                  <Ionicons name="time-outline" size={18} color={c.textSecondaryAlt} />
                </TouchableOpacity>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>{t('filters.toLabel')}</Text>
                <TouchableOpacity
                  style={styles.fieldRow}
                  onPress={() => comingSoon('Time picker')}
                  accessibilityRole="button"
                  accessibilityLabel="Select end time"
                >
                  <Text style={styles.fieldPlaceholder}>{t('filters.timePlaceholder')}</Text>
                  <Ionicons name="time-outline" size={18} color={c.textSecondaryAlt} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setMode('location')}
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === 'location' }}
            >
              <View style={[styles.radioOuter, mode === 'location' && styles.radioOuterActive]}>
                {mode === 'location' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.sectionLabel}>{t('filters.locationSection')}</Text>
            </TouchableOpacity>
            <View style={[styles.locationRow, mode !== 'location' && styles.disabled]}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => comingSoon('Location filter')}
                disabled={mode !== 'location'}
                accessibilityRole="button"
                accessibilityLabel="Select province or city"
              >
                <Text style={styles.dropdownText}>{t('filters.provinceCityDropdown')}</Text>
                <Ionicons name="chevron-down" size={14} color={c.textSecondaryAlt} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => comingSoon('Location filter')}
                disabled={mode !== 'location'}
                accessibilityRole="button"
                accessibilityLabel="Select ward or commune"
              >
                <Text style={styles.dropdownText}>{t('filters.wardCommuneDropdown')}</Text>
                <Ionicons name="chevron-down" size={14} color={c.textSecondaryAlt} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => comingSoon('Saved locations')}
                disabled={mode !== 'location'}
                accessibilityRole="button"
                accessibilityLabel="Saved locations"
              >
                <Ionicons name="heart-outline" size={18} color={c.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Distance */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setMode('distance')}
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === 'distance' }}
            >
              <View style={[styles.radioOuter, mode === 'distance' && styles.radioOuterActive]}>
                {mode === 'distance' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.sectionLabel}>{t('filters.distanceSection')}</Text>
            </TouchableOpacity>
            <View style={styles.sliderBlock}>
              <RangeSlider min={1} max={20} step={1} value={distance} onChange={setDistance} disabled={mode !== 'distance'} />
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeLabelText}>1 km</Text>
                <Text style={styles.rangeLabelText}>20 km</Text>
              </View>
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <View style={styles.priceHeader}>
              <Text style={styles.sectionLabel}>{t('filters.priceRangeSection')}</Text>
              <Text style={styles.priceValue}>
                ${price[0]} - ${price[1]}
              </Text>
            </View>
            <View style={styles.sliderBlock}>
              <RangeSlider min={0} max={200} step={10} value={price} onChange={setPrice} />
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeLabelText}>$0</Text>
                <Text style={styles.rangeLabelText}>$200+</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={reset} accessibilityRole="button">
            <Text style={styles.resetButtonText}>{t('filters.resetButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.applyButtonText}>{t('filters.applyButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DatePickerModal
        visible={datePickerVisible}
        initialDate={date ?? undefined}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(picked) => {
          setDate(picked);
          setDatePickerVisible(false);
        }}
        themeColors={c}
      />
    </Modal>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '85%',
      backgroundColor: c.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 17,
      borderBottomWidth: 1,
      borderBottomColor: c.bookingSubtleBorder,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: c.venueCardHeadingText,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: 16,
      gap: 24,
    },
    section: {
      gap: 12,
    },
    sectionLabel: {
      fontSize: 16,
      color: c.venueCardHeadingText,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
    },
    fieldPlaceholder: {
      fontSize: 14,
      color: c.textMuted,
    },
    fieldValue: {
      fontSize: 14,
      color: c.primary,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondaryAlt,
    },
    timeRow: {
      flexDirection: 'row',
      gap: 16,
    },
    timeField: {
      flex: 1,
      gap: 4,
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    radioOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: c.outlineMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterActive: {
      borderColor: c.primary,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
    },
    disabled: {
      opacity: 0.4,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dropdown: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
    },
    dropdownText: {
      fontSize: 14,
      color: c.venueCardHeadingText,
    },
    favoriteButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    sliderBlock: {
      paddingHorizontal: 4,
      gap: 8,
    },
    rangeLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rangeLabelText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.rangeLabelText,
    },
    priceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    priceValue: {
      fontSize: 14,
      fontWeight: '700',
      color: c.primary,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 17,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: c.bookingSubtleBorder,
    },
    resetButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.outlineMuted,
    },
    resetButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.venueCardHeadingText,
    },
    applyButton: {
      flex: 2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    applyButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.white,
    },
  });
}
