import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectField } from '@/components/SelectField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillTierColor, skillsForSport } from '@/constants/matchSkills';
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

/**
 * Filter sheet (Figma node 87:1903, SPOT-76). Self-contained Modal-based
 * component like src/components/ProfileMenu.tsx — not a route, so no
 * expo-router dependency, matching the thin-route split's scope (only
 * app/<route>.tsx + src/screens pairs need that split).
 *
 * Location (Province/City) now calls the real `GET /geo/vn` shape via
 * matchService's `getVnAdminTree()` mock — spot-backend shipped this
 * dataset in commit 84474d2 (SPOT-76 plan mục 2.1, previously blocked on
 * an npm VN-provinces package that didn't work in React Native; the
 * backend team solved it server-side instead). `SelectField` (already used
 * by profile edit) backs both dropdowns — City is empty/disabled until a
 * Province is picked.
 *
 * Distance (radius slider) is still stubbed: needs the device's current
 * lat/lng (`expo-location`, not installed yet) to mean anything — Figma
 * itself renders this section dimmed/inert when Location is selected, so
 * the "not functional yet" state already matches the design intent.
 *
 * No slider/date-picker library is installed (`@react-native-community/*`
 * isn't a dependency), so Date/Time/Price use plain TextInput fields typed
 * to match spot-backend's exact formats (YYYY-MM-DD / HH:mm) instead of the
 * drag widgets Figma mocks — swap for a real picker/slider if one gets
 * added as a dependency later.
 */
export default function FilterSheet({ visible, sport, initialFilters, onClose, onApply }: Props) {
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [locationMode, setLocationMode] = useState<LocationMode>('location');
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');

  useEffect(() => {
    if (!visible) return;
    setDate(initialFilters.date ?? '');
    setTimeFrom(initialFilters.timeFrom ?? '');
    setTimeTo(initialFilters.timeTo ?? '');
    setSelectedSkills(initialFilters.skill);
    setPriceMin(initialFilters.priceMin != null ? String(initialFilters.priceMin) : '');
    setPriceMax(initialFilters.priceMax != null ? String(initialFilters.priceMax) : '');
    setProvinceCode(initialFilters.province ?? '');
    setCityCode(initialFilters.city ?? '');
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
    setPriceMin('');
    setPriceMax('');
    setProvinceCode('');
    setCityCode('');
    setLocationMode('location');
  };

  const handleApply = () => {
    const parsedMin = priceMin.trim() ? Number(priceMin) : undefined;
    const parsedMax = priceMax.trim() ? Number(priceMax) : undefined;
    onApply({
      date: date.trim() || undefined,
      timeFrom: timeFrom.trim() || undefined,
      timeTo: timeTo.trim() || undefined,
      skill: selectedSkills,
      priceMin: Number.isFinite(parsedMin) ? parsedMin : undefined,
      priceMax: Number.isFinite(parsedMax) ? parsedMax : undefined,
      province: locationMode === 'location' ? provinceCode || undefined : undefined,
      city: locationMode === 'location' ? cityCode || undefined : undefined,
    });
    onClose();
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
              <TextInput
                testID="filter-date-input"
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.outline}
                value={date}
                onChangeText={setDate}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Time Range</Text>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.fieldLabel}>From</Text>
                  <TextInput
                    testID="filter-time-from-input"
                    style={styles.input}
                    placeholder="HH:mm"
                    placeholderTextColor={colors.outline}
                    value={timeFrom}
                    onChangeText={setTimeFrom}
                  />
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.fieldLabel}>To</Text>
                  <TextInput
                    testID="filter-time-to-input"
                    style={styles.input}
                    placeholder="HH:mm"
                    placeholderTextColor={colors.outline}
                    value={timeTo}
                    onChangeText={setTimeTo}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity testID="filter-mode-location" style={styles.radioRow} onPress={() => setLocationMode('location')}>
                <View style={[styles.radioOuter, locationMode === 'location' && styles.radioOuterActive]}>
                  {locationMode === 'location' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.sectionLabel}>Location</Text>
              </TouchableOpacity>
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
                    placeholder={provinceCode ? 'Select ward' : 'Pick a province first'}
                    value={cityCode}
                    onChange={setCityCode}
                    options={cityOptions}
                    containerStyle={styles.rowItem}
                  />
                </View>
              )}
            </View>

            <View style={styles.section}>
              <TouchableOpacity testID="filter-mode-distance" style={styles.radioRow} onPress={() => setLocationMode('distance')}>
                <View style={[styles.radioOuter, locationMode === 'distance' && styles.radioOuterActive]}>
                  {locationMode === 'distance' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.sectionLabel}>Distance</Text>
              </TouchableOpacity>
              <View style={styles.disabledBlock}>
                <Text style={styles.disabledFieldText}>1 km — 20 km</Text>
              </View>
              <Text style={styles.helperText}>Needs your device location — coming soon.</Text>
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
                        { backgroundColor: selected ? tier.text : tier.bg, borderColor: tier.border },
                      ]}
                      onPress={() => toggleSkill(skill.code)}
                    >
                      <Text style={[styles.skillChipText, { color: selected ? colors.white : tier.text }]}>{skill.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Price Range (VNĐ)</Text>
              <View style={styles.row}>
                <TextInput
                  testID="filter-price-min-input"
                  style={[styles.input, styles.rowItem]}
                  placeholder="Min"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  value={priceMin}
                  onChangeText={setPriceMin}
                />
                <TextInput
                  testID="filter-price-max-input"
                  style={[styles.input, styles.rowItem]}
                  placeholder="Max"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  value={priceMax}
                  onChangeText={setPriceMax}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity testID="filter-reset" style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="filter-apply" style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
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
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.headingText,
    backgroundColor: colors.white,
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
  disabledBlock: { flexDirection: 'row', gap: spacing.sm, opacity: 0.4 },
  disabledField: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  disabledFieldText: { fontSize: 13, color: colors.bodyText },
  helperText: { fontSize: 11, color: colors.outline },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  skillChipText: { fontSize: 13, fontWeight: '700' },
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
  applyButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
