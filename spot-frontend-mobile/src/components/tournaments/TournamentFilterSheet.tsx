import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectField } from '@/components/SelectField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getVnAdminTree } from '@/services/matchService';
import type { TournamentFilters } from '@/types/tournamentFilters';
import type { VnProvince } from '@/types/geo';

type Props = {
  visible: boolean;
  initialFilters: TournamentFilters;
  onClose: () => void;
  onApply: (filters: TournamentFilters) => void;
};

type LocationMode = 'location' | 'distance';

const RADIUS_MIN = 1;
const RADIUS_MAX = 20;
const RADIUS_DEFAULT = 10;
const SLIDER_INSET = spacing.md;

/**
 * Tournament browse filter sheet — copied from GroupFilterSheet.tsx with the
 * Skill Level section removed (tournaments have no skill gate — TOURNAMENT_PLAN.md).
 * Location (province/ward + favorited) vs Distance (1–20km radius via
 * expo-location) radio; the two modes are XOR at the API level, and both are XOR
 * with the shared free-text search bar.
 */
export default function TournamentFilterSheet({ visible, initialFilters, onClose, onApply }: Props) {
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

  const handleReset = () => {
    setFavoritedOnly(false);
    setProvinceCode('');
    setCityCode('');
    setRadiusKm(RADIUS_DEFAULT);
    setLocationMode('location');
  };

  const handleApply = async () => {
    const base: TournamentFilters = { favorited: favoritedOnly || undefined };

    if (locationMode === 'distance') {
      setLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location needed',
            'Allow location access to search tournaments near you, or switch back to Location.'
          );
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity testID="tournament-filter-close" style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={16} color={colors.headingText} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <TouchableOpacity
                testID="tournament-filter-mode-location"
                style={styles.radioRow}
                onPress={() => setLocationMode('location')}
              >
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
                        testID="tournament-filter-favorited-toggle"
                        style={styles.favoriteButton}
                        onPress={() => setFavoritedOnly((prev) => !prev)}
                        accessibilityRole="button"
                        accessibilityLabel="Favorited tournaments only"
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
              <TouchableOpacity
                testID="tournament-filter-mode-distance"
                style={styles.radioRow}
                onPress={() => setLocationMode('distance')}
              >
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
                      selectedStyle={{ backgroundColor: colors.primaryDark }}
                      unselectedStyle={{ backgroundColor: colors.cardBorder }}
                      markerStyle={styles.sliderMarker}
                      touchDimensions={{ height: 40, width: 40, borderRadius: 20, slipDisplacement: 40 }}
                    />
                  )}
                </View>
                <View style={styles.rangeLabels}>
                  <Text style={styles.helperText}>{RADIUS_MIN} km</Text>
                  <Text style={styles.helperText}>{RADIUS_MAX} km</Text>
                </View>
                <Text style={styles.helperText}>Uses your current device location.</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity testID="tournament-filter-reset" style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="tournament-filter-apply"
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
  helperText: { fontSize: 11, color: colors.outline },
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
