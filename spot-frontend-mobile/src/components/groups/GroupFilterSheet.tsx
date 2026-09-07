import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SelectField } from '@/components/SelectField';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/spacing';
import { skillsForSport } from '@/constants/matchSkills';
import { groupSkillTier } from '@/components/groups/groupPresentation';
import { groupSkillLabel } from '@/components/groups/groupPresentation';
import { getVnAdminTree } from '@/services/matchService';
import { promptLocationFailure, requestCurrentPosition } from '@/utils/location';
import type { GroupFilters } from '@/types/groupFilters';
import type { Sport } from '@/types/match';
import type { VnProvince } from '@/types/geo';

type Props = {
  visible: boolean;
  sport: Sport;
  initialFilters: GroupFilters;
  onClose: () => void;
  onApply: (filters: GroupFilters) => void;
};

type LocationMode = 'location' | 'distance';

const RADIUS_MIN = 0;
const RADIUS_MAX = 50;
const RADIUS_DEFAULT = 10;
// Keep the slider thumbs off the sheet edges — same reason as FilterSheet.tsx.
const SLIDER_INSET = spacing.md;

/**
 * Groups browse filter sheet — mirrors src/components/matches/FilterSheet.tsx
 * (Groups implementation plan). No Date/Time/Price sections (groups have no
 * schedule-slot or fee concept at the browse level) — just Location/Distance,
 * Skill Level, and Favorited. Distance is a working 0–50km radius slider
 * (same MultiSlider widget as FilterSheet's Price Range); on Apply it reads
 * the device's current position via expo-location and emits
 * latitude/longitude/radiusKm (XOR with province/city at the API level).
 */
export default function GroupFilterSheet({ visible, sport, initialFilters, onClose, onApply }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [favoritedOnly, setFavoritedOnly] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>('location');
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [radiusKm, setRadiusKm] = useState(RADIUS_DEFAULT);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedSkills(initialFilters.skill);
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
    setSelectedSkills([]);
    setFavoritedOnly(false);
    setProvinceCode('');
    setCityCode('');
    setRadiusKm(RADIUS_DEFAULT);
    setLocationMode('location');
  };

  const handleApply = async () => {
    const base = { skill: selectedSkills, favorited: favoritedOnly || undefined };

    if (locationMode === 'distance') {
      setLocating(true);
      try {
        const pos = await requestCurrentPosition({ offerEnable: true });
        if (!pos.ok) {
          promptLocationFailure(pos.reason);
          return;
        }
        onApply({
          ...base,
          latitude: pos.latitude,
          longitude: pos.longitude,
          radiusKm,
        });
        onClose();
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('groups.filter.title')}</Text>
            <TouchableOpacity testID="group-filter-close" style={styles.closeButton} onPress={onClose} accessibilityLabel={t('groups.actions.close')}>
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <TouchableOpacity testID="group-filter-mode-location" style={styles.radioRow} onPress={() => setLocationMode('location')}>
                <View style={[styles.radioOuter, locationMode === 'location' && styles.radioOuterActive]}>
                  {locationMode === 'location' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.sectionLabel}>{t('groups.filter.location')}</Text>
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
                    themeColors={colors}
                    label={t('groups.form.province')}
                    placeholder={t('groups.form.selectProvince')}
                    value={provinceCode}
                    onChange={(value) => {
                      setProvinceCode(value);
                      setCityCode('');
                    }}
                    options={provinces.map((p) => ({ label: p.name, value: p.code }))}
                    containerStyle={styles.rowItem}
                  />
                  <SelectField
                    themeColors={colors}
                    label={t('groups.form.ward')}
                    placeholder={provinceCode ? t('groups.form.selectWard') : t('groups.form.pickProvince')}
                    value={cityCode}
                    onChange={setCityCode}
                    options={cityOptions}
                    containerStyle={styles.rowItem}
                  />
                  <View style={styles.favoriteWrap}>
                    <Text style={styles.favoriteSpacerLabel}> </Text>
                    <TouchableOpacity
                      testID="group-filter-favorited-toggle"
                      style={styles.favoriteButton}
                      onPress={() => setFavoritedOnly((prev) => !prev)}
                      accessibilityRole="button"
                      accessibilityLabel={t('groups.filter.favoritesOnly')}
                    >
                      <Ionicons
                        name={favoritedOnly ? 'heart' : 'heart-outline'}
                        size={18}
                        color={favoritedOnly ? colors.error : colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity testID="group-filter-mode-distance" style={styles.radioRow} onPress={() => setLocationMode('distance')}>
                <View style={[styles.radioOuter, locationMode === 'distance' && styles.radioOuterActive]}>
                  {locationMode === 'distance' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.sectionLabel}>{t('groups.filter.distance')}</Text>
                <Text style={[styles.distanceValue, locationMode !== 'distance' && styles.dimmed]}>{radiusKm} km</Text>
              </TouchableOpacity>
              <View
                style={locationMode !== 'distance' && styles.dimmed}
                pointerEvents={locationMode === 'distance' ? 'auto' : 'none'}
              >
                <View style={styles.sliderWrap} onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}>
                  {sliderWidth > 0 && (
                    <MultiSlider
                      values={[radiusKm]}
                      min={RADIUS_MIN}
                      max={RADIUS_MAX}
                      step={1}
                      sliderLength={Math.max(sliderWidth - SLIDER_INSET * 2, 0)}
                      onValuesChange={([value]) => setRadiusKm(value)}
                      enabledOne={locationMode === 'distance'}
                      selectedStyle={{ backgroundColor: colors.primary }}
                      unselectedStyle={{ backgroundColor: colors.surfaceBorder }}
                      markerStyle={styles.sliderMarker}
                      touchDimensions={{ height: 40, width: 40, borderRadius: 20, slipDisplacement: 40 }}
                    />
                  )}
                </View>
                <View style={styles.rangeLabels}>
                  <Text style={styles.helperText}>{RADIUS_MIN} km</Text>
                  <Text style={styles.helperText}>{RADIUS_MAX} km</Text>
                </View>
                <Text style={styles.helperText}>{t('groups.filter.deviceLocation')}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('groups.skill.title')}</Text>
              <View style={styles.skillGrid}>
                {skillsForSport(sport).map((skill) => {
                  const selected = selectedSkills.includes(skill.code);
                  const tier = groupSkillTier(colors, sport, skill.code);
                  return (
                    <TouchableOpacity
                      key={skill.code}
                      testID={`group-filter-skill-${skill.code}`}
                      style={[
                        styles.skillChip,
                        { backgroundColor: tier.text, borderColor: tier.text },
                        selected && styles.skillChipSelected,
                      ]}
                      onPress={() => toggleSkill(skill.code)}
                    >
                      {selected && <Ionicons name="checkmark" size={14} color={colors.white} style={styles.skillChipCheck} />}
                      <Text style={styles.skillChipText}>{groupSkillLabel(t, skill.code)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity testID="group-filter-reset" style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>{t('groups.filter.reset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="group-filter-apply"
              style={[styles.applyButton, locating && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.applyButtonText}>{t('groups.filter.apply')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.tintedSurface,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionLabel: { fontSize: 15, color: colors.textPrimary },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1, gap: spacing.xxs },
  geoLoading: { alignSelf: 'flex-start', marginVertical: spacing.sm },
  favoriteWrap: { gap: spacing.xxs },
  favoriteSpacerLabel: { fontSize: 14, marginBottom: 6, opacity: 0 },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  distanceValue: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', color: colors.primary },
  dimmed: { opacity: 0.4 },
  sliderWrap: { width: '100%', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: SLIDER_INSET },
  sliderMarker: {
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  helperText: { fontSize: 11, color: colors.textMuted },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skillChipSelected: { borderColor: colors.textPrimary, borderWidth: 2 },
  skillChipCheck: { marginRight: spacing.xxs },
  skillChipText: { fontSize: 13, fontWeight: '700', color: colors.white },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.tintedSurface,
  },
  resetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  resetButtonText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  applyButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  applyButtonDisabled: { opacity: 0.6 },
  applyButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
