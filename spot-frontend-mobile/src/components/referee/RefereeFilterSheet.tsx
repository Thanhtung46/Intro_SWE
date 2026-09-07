import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectField } from '@/components/SelectField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { getVnAdminTree } from '@/services/matchService';
import type { VnProvince } from '@/types/geo';
import type { RefereeBoardFilters } from '@/types/refereeFilters';
import { showAlert } from '@/utils/showAlert';

type Props = {
  visible: boolean;
  initialFilters: RefereeBoardFilters;
  onClose: () => void;
  onApply: (filters: RefereeBoardFilters) => void;
};

const RADIUS_MIN = 1;
const RADIUS_MAX = 20;
const SLIDER_INSET = spacing.md;

/** Job Board filter sheet (Pencil "Book field - Filter 3" frame). Location
 *  (Province/City + favourites-only) XOR Distance (1–20 km). Mirrors
 *  src/components/groups/GroupFilterSheet.tsx minus the skill section. */
export default function RefereeFilterSheet({ visible, initialFilters, onClose, onApply }: Props) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<RefereeBoardFilters['mode']>('location');
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(false);
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [favoritedOnly, setFavoritedOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState(RADIUS_MAX);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMode(initialFilters.mode);
    setProvinceCode(initialFilters.province ?? '');
    setCityCode(initialFilters.city ?? '');
    setFavoritedOnly(initialFilters.favoritedOnly ?? false);
    setRadiusKm(initialFilters.radiusKm ?? RADIUS_MAX);
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
  const cityOptions = (selectedProvince?.cities ?? []).map((c) => ({ label: c.name, value: c.code }));

  const handleReset = () => {
    setMode('location');
    setProvinceCode('');
    setCityCode('');
    setFavoritedOnly(false);
    setRadiusKm(RADIUS_MAX);
  };

  const handleApply = async () => {
    if (mode === 'distance') {
      setLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showAlert(t('referee.filter.locationNeededTitle'), t('referee.filter.locationNeededBody'));
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        onApply({ mode: 'distance', lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm });
        onClose();
      } catch {
        showAlert(t('referee.filter.locationUnavailableTitle'), t('referee.filter.locationUnavailableBody'));
      } finally {
        setLocating(false);
      }
      return;
    }
    onApply({
      mode: 'location',
      province: provinceCode || undefined,
      city: (provinceCode && cityCode) || undefined,
      favoritedOnly: favoritedOnly || undefined,
      radiusKm,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('referee.filter.title')}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={16} color={colors.headingText} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <TouchableOpacity style={styles.radioRow} onPress={() => setMode('location')}>
                <View style={[styles.radioOuter, mode === 'location' && styles.radioOuterActive]}>
                  {mode === 'location' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.sectionLabel}>{t('referee.filter.location')}</Text>
              </TouchableOpacity>
              <View style={mode !== 'location' && styles.dimmed} pointerEvents={mode === 'location' ? 'auto' : 'none'}>
                {provincesLoading ? (
                  <ActivityIndicator style={styles.geoLoading} color={colors.primary} />
                ) : (
                  <View style={styles.row}>
                    <SelectField
                      label={t('referee.filter.province')}
                      placeholder={t('referee.filter.province')}
                      value={provinceCode}
                      onChange={(value) => {
                        setProvinceCode(value);
                        setCityCode('');
                      }}
                      options={provinces.map((p) => ({ label: p.name, value: p.code }))}
                      containerStyle={styles.rowItem}
                    />
                    <SelectField
                      label={t('referee.filter.ward')}
                      placeholder={t('referee.filter.ward')}
                      value={cityCode}
                      onChange={setCityCode}
                      options={cityOptions}
                      containerStyle={styles.rowItem}
                    />
                    <View style={styles.favoriteWrap}>
                      <Text style={styles.favoriteSpacerLabel}> </Text>
                      <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={() => setFavoritedOnly((v) => !v)}
                        accessibilityLabel={t('referee.filter.favoritesOnly')}
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
              <TouchableOpacity style={styles.radioRow} onPress={() => setMode('distance')}>
                <View style={[styles.radioOuter, mode === 'distance' && styles.radioOuterActive]}>
                  {mode === 'distance' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.sectionLabel}>{t('referee.filter.distance')}</Text>
                <Text style={[styles.distanceValue, mode !== 'distance' && styles.dimmed]}>{radiusKm} km</Text>
              </TouchableOpacity>
              <View style={mode !== 'distance' && styles.dimmed} pointerEvents={mode === 'distance' ? 'auto' : 'none'}>
                <View style={styles.sliderWrap} onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}>
                  {sliderWidth > 0 && (
                    <MultiSlider
                      values={[radiusKm]}
                      min={RADIUS_MIN}
                      max={RADIUS_MAX}
                      step={1}
                      sliderLength={Math.max(sliderWidth - SLIDER_INSET * 2, 0)}
                      onValuesChange={([value]) => setRadiusKm(value)}
                      enabledOne={mode === 'distance'}
                      selectedStyle={{ backgroundColor: colors.primaryDark }}
                      unselectedStyle={{ backgroundColor: colors.cardBorder }}
                      markerStyle={styles.sliderMarker}
                    />
                  )}
                </View>
                <View style={styles.rangeLabels}>
                  <Text style={styles.helperText}>{RADIUS_MIN} km</Text>
                  <Text style={styles.helperText}>{RADIUS_MAX} km</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>{t('referee.filter.reset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, locating && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.applyButtonText}>{t('referee.filter.apply')}</Text>
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
  sheet: { maxHeight: '85%', backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
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
  sliderWrap: { width: '100%', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: SLIDER_INSET },
  sliderMarker: {
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  helperText: { fontSize: 11, color: colors.outline },
  footer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.iconBackground },
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
