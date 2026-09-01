import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectField } from '@/components/SelectField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillTierColor, skillsForSport } from '@/constants/matchSkills';
import { formatVnd } from '@/utils/format';
import { formatDisplayDate, parseHm, parseIsoDate, toHm, toIsoDate } from '@/utils/dateTime';
import { getVnAdminTree } from '@/services/matchService';
import type { MatchFilters } from '@/types/matchFilters';
import type { Sport } from '@/types/match';
import type { VnProvince } from '@/types/geo';

type Props = {
  visible: boolean;
  sport: Sport;
  initialFilters: MatchFilters;
  onClose: () => void;
  onApply: (filters: MatchFilters) => void;
};

type LocationMode = 'location' | 'distance';

const PRICE_MIN = 0;
const PRICE_MAX = 500000;
const PRICE_STEP = 10000;
const RADIUS_MIN = 1;
const RADIUS_MAX = 20;
const RADIUS_DEFAULT = 10;
// Extra inset beyond the sheet's own content padding so the slider's thumbs
// (and their larger touch targets) never sit flush against the screen edge
// / the phone's gesture-nav strip.
const SLIDER_INSET = spacing.md;

// @react-native-community/datetimepicker has no web build, so on web fall back
// to the browser's own native date/time inputs — same pattern as
// HostMatchScreen's WebDateTimeInput. `date` is an ISO yyyy-mm-dd string and
// `timeFrom`/`timeTo` are HH:mm, exactly the value format of these inputs.
const IS_WEB = Platform.OS === 'web';

function WebDateTimeInput(props: { type: 'date' | 'time'; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type={props.type}
      value={props.value}
      onChange={(e: { target: { value: string } }) => props.onChange(e.target.value)}
      style={{
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.cardBorder,
        borderRadius: 10,
        padding: spacing.sm,
        fontSize: 14,
        color: colors.headingText,
        backgroundColor: colors.white,
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
}

/**
 * Filter sheet (Figma node 87:1903, SPOT-76). Self-contained Modal-based
 * component like src/components/ProfileMenu.tsx — not a route, so no
 * expo-router dependency, matching the thin-route split's scope (only
 * app/<route>.tsx + src/screens pairs need that split).
 *
 * Location (Province/City) calls the real `GET /geo/vn` shape via
 * matchService's `getVnAdminTree()` — `SelectField` (already used by
 * profile edit) backs both dropdowns — City is empty/disabled until a
 * Province is picked.
 *
 * Distance (radius slider) mirrors GroupFilterSheet/TournamentFilterSheet:
 * a 1–20km slider; on Apply it requests `expo-location` foreground
 * permission, reads the device position, and emits latitude/longitude/
 * radiusKm (XOR with `location` / province+city at the API level).
 *
 * Date/Time use `@react-native-community/datetimepicker` on native and fall
 * back to raw `<input type="date"|"time">` on web (no web build), matching
 * Figma's calendar/clock pickers. Price Range uses a two-thumb slider
 * (`@ptomasroos/react-native-multi-slider`, pure JS, no native build step)
 * in VND (see src/utils/format.ts's currency decision — Figma mocks `$`
 * but spot-backend only ever works in VND).
 */
export default function FilterSheet({ visible, sport, initialFilters, onClose, onApply }: Props) {
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState(PRICE_MIN);
  const [priceMax, setPriceMax] = useState(PRICE_MAX);
  const [favoritedOnly, setFavoritedOnly] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>('location');
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [radiusKm, setRadiusKm] = useState(RADIUS_DEFAULT);
  const [locating, setLocating] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [distanceSliderWidth, setDistanceSliderWidth] = useState(0);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeFromPicker, setShowTimeFromPicker] = useState(false);
  const [showTimeToPicker, setShowTimeToPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDate(initialFilters.date ?? '');
    setTimeFrom(initialFilters.timeFrom ?? '');
    setTimeTo(initialFilters.timeTo ?? '');
    setSelectedSkills(initialFilters.skill);
    setPriceMin(initialFilters.priceMin ?? PRICE_MIN);
    setPriceMax(initialFilters.priceMax ?? PRICE_MAX);
    setFavoritedOnly(initialFilters.favorited ?? false);
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

  const toggleSkill = (code: string) => {
    setSelectedSkills((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleReset = () => {
    setDate('');
    setTimeFrom('');
    setTimeTo('');
    setSelectedSkills([]);
    setPriceMin(PRICE_MIN);
    setPriceMax(PRICE_MAX);
    setFavoritedOnly(false);
    setProvinceCode('');
    setCityCode('');
    setRadiusKm(RADIUS_DEFAULT);
    setLocationMode('location');
  };

  const handleApply = async () => {
    const base: MatchFilters = {
      date: date || undefined,
      timeFrom: timeFrom || undefined,
      timeTo: timeTo || undefined,
      skill: selectedSkills,
      priceMin: priceMin > PRICE_MIN ? priceMin : undefined,
      priceMax: priceMax < PRICE_MAX ? priceMax : undefined,
      favorited: favoritedOnly || undefined,
    };

    if (locationMode === 'distance') {
      setLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location needed', 'Allow location access to search matches near you, or switch back to Location.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        onApply({
          ...base,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          radiusKm,
        });
        onClose();
      } catch {
        Alert.alert('Location unavailable', "Couldn't get your current location. Try again or switch back to Location.");
      } finally {
        setLocating(false);
      }
      return;
    }

    onApply({
      ...base,
      province: provinceCode || undefined,
      city: cityCode || undefined,
    });
    onClose();
  };

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setDate(toIsoDate(selected));
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity testID="filter-close" style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={16} color={colors.headingText} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Date</Text>
              {IS_WEB ? (
                <View testID="filter-date-input">
                  <WebDateTimeInput type="date" value={date} onChange={setDate} />
                </View>
              ) : (
                <TouchableOpacity
                  testID="filter-date-input"
                  style={styles.pickerField}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={date ? styles.pickerValue : styles.pickerPlaceholder}>
                    {date ? formatDisplayDate(date) : 'Select a date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
                </TouchableOpacity>
              )}
              {showDatePicker && !IS_WEB && (
                <DateTimePicker
                  value={date ? parseIsoDate(date) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <TouchableOpacity style={styles.doneButton} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Time Range</Text>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.fieldLabel}>From</Text>
                  {IS_WEB ? (
                    <View testID="filter-time-from-input">
                      <WebDateTimeInput type="time" value={timeFrom} onChange={setTimeFrom} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      testID="filter-time-from-input"
                      style={styles.pickerField}
                      onPress={() => setShowTimeFromPicker(true)}
                    >
                      <Text style={timeFrom ? styles.pickerValue : styles.pickerPlaceholder}>{timeFrom || 'HH:mm'}</Text>
                      <Ionicons name="time-outline" size={18} color={colors.primaryDark} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.fieldLabel}>To</Text>
                  {IS_WEB ? (
                    <View testID="filter-time-to-input">
                      <WebDateTimeInput type="time" value={timeTo} onChange={setTimeTo} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      testID="filter-time-to-input"
                      style={styles.pickerField}
                      onPress={() => setShowTimeToPicker(true)}
                    >
                      <Text style={timeTo ? styles.pickerValue : styles.pickerPlaceholder}>{timeTo || 'HH:mm'}</Text>
                      <Ionicons name="time-outline" size={18} color={colors.primaryDark} />
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
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.section}>
              <TouchableOpacity testID="filter-mode-location" style={styles.radioRow} onPress={() => setLocationMode('location')}>
                <View style={[styles.radioOuter, locationMode === 'location' && styles.radioOuterActive]}>
                  {locationMode === 'location' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.sectionLabel}>Location</Text>
              </TouchableOpacity>
              <View
                style={locationMode !== 'location' && styles.dimmed}
                pointerEvents={locationMode === 'location' ? 'auto' : 'none'}
              >
                {provincesLoading ? (
                  <ActivityIndicator style={styles.geoLoading} color={colors.primary} />
                ) : (
                  <View style={styles.row}>
                    <SelectField
                      label="Province/City"
                      placeholder="Select province"
                      value={provinceCode}
                      onChange={(value) => {
                        setProvinceCode(value);
                        setCityCode('');
                      }}
                      options={provinces.map((p) => ({ label: p.name, value: p.code }))}
                      containerStyle={styles.rowItem}
                    />
                    <SelectField
                      label="Ward/Commune"
                      placeholder={provinceCode ? 'Select ward' : 'Pick province'}
                      value={cityCode}
                      onChange={setCityCode}
                      options={cityOptions}
                      containerStyle={styles.rowItem}
                    />
                    <View style={styles.favoriteWrap}>
                      <Text style={styles.favoriteSpacerLabel}> </Text>
                      <TouchableOpacity
                        testID="filter-favorited-toggle"
                        style={styles.favoriteButton}
                        onPress={() => setFavoritedOnly((prev) => !prev)}
                        accessibilityRole="button"
                        accessibilityLabel="Favorited matches only"
                      >
                        <Ionicons
                          name={favoritedOnly ? 'heart' : 'heart-outline'}
                          size={18}
                          color={favoritedOnly ? colors.error : colors.primaryDark}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity testID="filter-mode-distance" style={styles.radioRow} onPress={() => setLocationMode('distance')}>
                <View style={[styles.radioOuter, locationMode === 'distance' && styles.radioOuterActive]}>
                  {locationMode === 'distance' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.sectionLabel}>Distance</Text>
                <Text style={[styles.distanceValue, locationMode !== 'distance' && styles.dimmed]}>{radiusKm} km</Text>
              </TouchableOpacity>
              <View
                style={locationMode !== 'distance' && styles.dimmed}
                pointerEvents={locationMode === 'distance' ? 'auto' : 'none'}
              >
                <View style={styles.sliderWrap} onLayout={(e) => setDistanceSliderWidth(e.nativeEvent.layout.width)}>
                  {distanceSliderWidth > 0 && (
                    <MultiSlider
                      values={[radiusKm]}
                      min={RADIUS_MIN}
                      max={RADIUS_MAX}
                      step={1}
                      sliderLength={Math.max(distanceSliderWidth - SLIDER_INSET * 2, 0)}
                      onValuesChange={([value]) => setRadiusKm(value)}
                      enabledOne={locationMode === 'distance'}
                      selectedStyle={{ backgroundColor: colors.primaryDark }}
                      unselectedStyle={{ backgroundColor: colors.cardBorder }}
                      markerStyle={styles.sliderMarker}
                      touchDimensions={{ height: 40, width: 40, borderRadius: 20, slipDisplacement: 40 }}
                    />
                  )}
                </View>
                <View style={styles.priceRangeLabels}>
                  <Text style={styles.helperText}>{RADIUS_MIN} km</Text>
                  <Text style={styles.helperText}>{RADIUS_MAX} km</Text>
                </View>
                <Text style={styles.helperText}>Uses your current device location.</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Skill Level</Text>
              <View style={styles.skillGrid}>
                {skillsForSport(sport).map((skill) => {
                  const selected = selectedSkills.includes(skill.code);
                  const tier = skillTierColor(sport, skill.code);
                  return (
                    <TouchableOpacity
                      key={skill.code}
                      testID={`filter-skill-${skill.code}`}
                      style={[
                        styles.skillChip,
                        { backgroundColor: tier.text, borderColor: tier.text },
                        selected && styles.skillChipSelected,
                      ]}
                      onPress={() => toggleSkill(skill.code)}
                    >
                      {selected && <Ionicons name="checkmark" size={14} color={colors.white} style={styles.skillChipCheck} />}
                      <Text style={styles.skillChipText}>{skill.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.priceHeaderRow}>
                <Text style={styles.sectionLabel}>Price Range</Text>
                <Text style={styles.priceValue}>
                  {formatVnd(priceMin)} - {priceMax >= PRICE_MAX ? `${formatVnd(PRICE_MAX)}+` : formatVnd(priceMax)}
                </Text>
              </View>
              <View style={styles.sliderWrap} onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}>
                {sliderWidth > 0 && (
                  <MultiSlider
                    values={[priceMin, priceMax]}
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    sliderLength={Math.max(sliderWidth - SLIDER_INSET * 2, 0)}
                    onValuesChange={([lo, hi]) => {
                      setPriceMin(lo);
                      setPriceMax(hi);
                    }}
                    selectedStyle={{ backgroundColor: colors.primaryDark }}
                    unselectedStyle={{ backgroundColor: colors.cardBorder }}
                    markerStyle={styles.sliderMarker}
                    touchDimensions={{ height: 40, width: 40, borderRadius: 20, slipDisplacement: 40 }}
                  />
                )}
              </View>
              <View style={styles.priceRangeLabels}>
                <Text style={styles.helperText}>{formatVnd(PRICE_MIN)}</Text>
                <Text style={styles.helperText}>{formatVnd(PRICE_MAX)}+</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity testID="filter-reset" style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="filter-apply"
              style={[styles.applyButton, locating && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.sheetOverlay, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.iconBackground,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.headingText },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionLabel: { fontSize: 15, color: colors.headingText },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.bodyText },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1, gap: spacing.xxs },
  geoLoading: { alignSelf: 'flex-start', marginVertical: spacing.sm },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  pickerValue: { fontSize: 14, color: colors.headingText },
  pickerPlaceholder: { fontSize: 14, color: colors.outline },
  doneButton: { alignSelf: 'flex-end', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  doneButtonText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  favoriteWrap: { gap: spacing.xxs },
  favoriteSpacerLabel: { fontSize: 14, marginBottom: 6, opacity: 0 },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: colors.primaryDark },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primaryDark },
  distanceValue: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  dimmed: { opacity: 0.4 },
  helperText: { fontSize: 11, color: colors.outline },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skillChipSelected: { borderColor: colors.headingText, borderWidth: 2 },
  skillChipCheck: { marginRight: spacing.xxs },
  skillChipText: { fontSize: 13, fontWeight: '700', color: colors.white },
  priceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceValue: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  sliderWrap: { width: '100%', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: SLIDER_INSET },
  sliderMarker: {
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  priceRangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.iconBackground,
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  resetButtonText: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  applyButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  applyButtonDisabled: { opacity: 0.6 },
  applyButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
