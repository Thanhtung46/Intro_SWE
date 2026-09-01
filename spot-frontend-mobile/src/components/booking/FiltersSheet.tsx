import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import * as Location from 'expo-location';

import { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { SelectField } from '@/components/SelectField';
import RangeSlider from '@/components/booking/RangeSlider';
import DatePickerModal from '@/components/booking/DatePickerModal';
import { formatVnd } from '@/utils/format';
import { formatDisplayDate, parseHm, toHm, toIsoDate } from '@/utils/dateTime';
import { getVnAdminTree } from '@/services/matchService';
import { EMPTY_VENUE_FILTERS, VenueFilters } from '@/types/venueFilters';
import type { VnProvince } from '@/types/geo';

type LocationMode = 'location' | 'distance';

const PRICE_MIN = 0;
const PRICE_MAX = 500000;
const PRICE_STEP = 10000;
const RADIUS_MIN = 1;
const RADIUS_MAX = 20;
const RADIUS_DEFAULT = 10;

const IS_WEB = Platform.OS === 'web';

function WebTimeInput(props: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={props.value}
      onChange={(e: { target: { value: string } }) => props.onChange(e.target.value)}
      style={{
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#D9E1EC',
        borderRadius: 8,
        padding: 11,
        fontSize: 14,
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
}

type Props = {
  visible: boolean;
  initialFilters: VenueFilters;
  onClose: () => void;
  onApply: (filters: VenueFilters) => void;
};

/**
 * Booking Field search filters — Figma node 72:239 ("Book field - Filter 1").
 * Wired against real `GET /venues` query params (date/timeFrom/timeTo/
 * priceMin/priceMax/province/city/lat/long/radiusKm) — mirrors
 * src/components/matches/FilterSheet.tsx's Location/Distance split, reusing
 * SelectField + GET /geo/vn for province/city and expo-location for distance.
 */
export default function FiltersSheet({ visible, initialFilters, onClose, onApply }: Props) {
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const [locationMode, setLocationMode] = useState<LocationMode>('location');
  const [date, setDate] = useState<string>('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [showTimeFromPicker, setShowTimeFromPicker] = useState(false);
  const [showTimeToPicker, setShowTimeToPicker] = useState(false);
  const [price, setPrice] = useState<[number, number]>([PRICE_MIN, PRICE_MAX]);
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [radiusKm, setRadiusKm] = useState(RADIUS_DEFAULT);
  const [locating, setLocating] = useState(false);
  const [distanceSliderWidth, setDistanceSliderWidth] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setDate(initialFilters.date ?? '');
    setTimeFrom(initialFilters.timeFrom ?? '');
    setTimeTo(initialFilters.timeTo ?? '');
    setPrice([initialFilters.priceMin ?? PRICE_MIN, initialFilters.priceMax ?? PRICE_MAX]);
    setProvinceCode(initialFilters.province ?? '');
    setCityCode(initialFilters.city ?? '');
    setRadiusKm(initialFilters.radiusKm ?? RADIUS_DEFAULT);
    setLocationMode(initialFilters.latitude != null ? 'distance' : 'location');
  }, [visible, initialFilters]);

  useEffect(() => {
    if (!visible || provinces.length > 0) return;
    setProvincesLoading(true);
    getVnAdminTree()
      .then((tree) => setProvinces(tree.provinces))
      .catch(() => setProvinces([]))
      .finally(() => setProvincesLoading(false));
  }, [visible, provinces.length]);

  const selectedProvince = provinces.find((p) => p.code === provinceCode);
  const cityOptions = (selectedProvince?.cities ?? []).map((city) => ({ label: city.name, value: city.code }));

  const reset = () => {
    setDate('');
    setTimeFrom('');
    setTimeTo('');
    setPrice([PRICE_MIN, PRICE_MAX]);
    setProvinceCode('');
    setCityCode('');
    setRadiusKm(RADIUS_DEFAULT);
    setLocationMode('location');
  };

  const handleApply = async () => {
    const base: VenueFilters = {
      date: date || undefined,
      timeFrom: timeFrom || undefined,
      timeTo: timeTo || undefined,
      priceMin: price[0] > PRICE_MIN ? price[0] : undefined,
      priceMax: price[1] < PRICE_MAX ? price[1] : undefined,
    };

    if (locationMode === 'distance') {
      setLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('filters.locationPermissionTitle'), t('filters.locationPermissionMessage'));
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        onApply({ ...base, latitude: pos.coords.latitude, longitude: pos.coords.longitude, radiusKm });
        onClose();
      } catch {
        Alert.alert(t('filters.locationUnavailableTitle'), t('filters.locationUnavailableMessage'));
      } finally {
        setLocating(false);
      }
      return;
    }

    onApply({ ...base, province: provinceCode || undefined, city: cityCode || undefined });
    onClose();
  };

  const handleTimeFromChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimeFromPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setTimeFrom(toHm(selected));
  };

  const handleTimeToChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimeToPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setTimeTo(toHm(selected));
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
                {date ? formatDisplayDate(date) : t('filters.datePlaceholder')}
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
                {IS_WEB ? (
                  <WebTimeInput value={timeFrom} onChange={setTimeFrom} />
                ) : (
                  <TouchableOpacity
                    style={styles.fieldRow}
                    onPress={() => setShowTimeFromPicker(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select start time"
                  >
                    <Text style={timeFrom ? styles.fieldValue : styles.fieldPlaceholder}>
                      {timeFrom || t('filters.timePlaceholder')}
                    </Text>
                    <Ionicons name="time-outline" size={18} color={c.textSecondaryAlt} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>{t('filters.toLabel')}</Text>
                {IS_WEB ? (
                  <WebTimeInput value={timeTo} onChange={setTimeTo} />
                ) : (
                  <TouchableOpacity
                    style={styles.fieldRow}
                    onPress={() => setShowTimeToPicker(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select end time"
                  >
                    <Text style={timeTo ? styles.fieldValue : styles.fieldPlaceholder}>
                      {timeTo || t('filters.timePlaceholder')}
                    </Text>
                    <Ionicons name="time-outline" size={18} color={c.textSecondaryAlt} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {showTimeFromPicker && !IS_WEB && (
              <DateTimePicker
                value={timeFrom ? parseHm(timeFrom) : new Date()}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeFromChange}
              />
            )}
            {showTimeToPicker && !IS_WEB && (
              <DateTimePicker
                value={timeTo ? parseHm(timeTo) : new Date()}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeToChange}
              />
            )}
            {Platform.OS === 'ios' && (showTimeFromPicker || showTimeToPicker) && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  setShowTimeFromPicker(false);
                  setShowTimeToPicker(false);
                }}
              >
                <Text style={styles.doneButtonText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setLocationMode('location')}
              accessibilityRole="radio"
              accessibilityState={{ checked: locationMode === 'location' }}
            >
              <View style={[styles.radioOuter, locationMode === 'location' && styles.radioOuterActive]}>
                {locationMode === 'location' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.sectionLabel}>{t('filters.locationSection')}</Text>
            </TouchableOpacity>
            <View
              style={[styles.locationRow, locationMode !== 'location' && styles.disabled]}
              pointerEvents={locationMode === 'location' ? 'auto' : 'none'}
            >
              {provincesLoading ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <>
                  <SelectField
                    label={t('filters.provinceCityDropdown')}
                    placeholder={t('filters.provinceCityDropdown')}
                    value={provinceCode}
                    onChange={(value) => {
                      setProvinceCode(value);
                      setCityCode('');
                    }}
                    options={provinces.map((p) => ({ label: p.name, value: p.code }))}
                    containerStyle={styles.dropdownContainer}
                  />
                  <SelectField
                    label={t('filters.wardCommuneDropdown')}
                    placeholder={t('filters.wardCommuneDropdown')}
                    value={cityCode}
                    onChange={setCityCode}
                    options={cityOptions}
                    containerStyle={styles.dropdownContainer}
                  />
                </>
              )}
            </View>
          </View>

          {/* Distance */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setLocationMode('distance')}
              accessibilityRole="radio"
              accessibilityState={{ checked: locationMode === 'distance' }}
            >
              <View style={[styles.radioOuter, locationMode === 'distance' && styles.radioOuterActive]}>
                {locationMode === 'distance' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.sectionLabel}>{t('filters.distanceSection')}</Text>
              <Text style={[styles.distanceValue, locationMode !== 'distance' && styles.disabled]}>
                {radiusKm} km
              </Text>
            </TouchableOpacity>
            <View
              style={[styles.sliderBlock, locationMode !== 'distance' && styles.disabled]}
              onLayout={(e) => setDistanceSliderWidth(e.nativeEvent.layout.width)}
            >
              {distanceSliderWidth > 0 && (
                <MultiSlider
                  values={[radiusKm]}
                  min={RADIUS_MIN}
                  max={RADIUS_MAX}
                  step={1}
                  sliderLength={Math.max(distanceSliderWidth - 24, 0)}
                  onValuesChange={([value]) => setRadiusKm(value)}
                  enabledOne={locationMode === 'distance'}
                  selectedStyle={{ backgroundColor: c.primary }}
                  unselectedStyle={{ backgroundColor: c.outlineMuted }}
                  markerStyle={styles.sliderMarker}
                  touchDimensions={{ height: 40, width: 40, borderRadius: 20, slipDisplacement: 40 }}
                />
              )}
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeLabelText}>{RADIUS_MIN} km</Text>
                <Text style={styles.rangeLabelText}>{RADIUS_MAX} km</Text>
              </View>
              <Text style={styles.helperText}>{t('filters.distanceHelperText')}</Text>
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <View style={styles.priceHeader}>
              <Text style={styles.sectionLabel}>{t('filters.priceRangeSection')}</Text>
              <Text style={styles.priceValue}>
                {formatVnd(price[0])} - {price[1] >= PRICE_MAX ? `${formatVnd(PRICE_MAX)}+` : formatVnd(price[1])}
              </Text>
            </View>
            <View style={styles.sliderBlock}>
              <RangeSlider min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP} value={price} onChange={setPrice} />
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeLabelText}>{formatVnd(PRICE_MIN)}</Text>
                <Text style={styles.rangeLabelText}>{formatVnd(PRICE_MAX)}+</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={reset} accessibilityRole="button">
            <Text style={styles.resetButtonText}>{t('filters.resetButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyButton, locating && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={locating}
            accessibilityRole="button"
          >
            {locating ? (
              <ActivityIndicator color={c.white} />
            ) : (
              <Text style={styles.applyButtonText}>{t('filters.applyButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <DatePickerModal
        visible={datePickerVisible}
        initialDate={date ? new Date(date) : undefined}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(picked) => {
          setDate(toIsoDate(picked));
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
    doneButton: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 8 },
    doneButtonText: { fontSize: 14, fontWeight: '700', color: c.primary },
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
      alignItems: 'flex-start',
      gap: 8,
    },
    dropdownContainer: {
      flex: 1,
      marginBottom: 0,
    },
    distanceValue: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', color: c.primary },
    sliderBlock: {
      paddingHorizontal: 4,
      gap: 8,
    },
    sliderMarker: {
      height: 22,
      width: 22,
      borderRadius: 11,
      backgroundColor: c.white,
      borderWidth: 2,
      borderColor: c.primary,
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
    helperText: { fontSize: 11, color: c.textMuted },
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
    applyButtonDisabled: { opacity: 0.6 },
    applyButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.white,
    },
  });
}
