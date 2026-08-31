import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { reverseGeocode, searchAddress, type GeoapifyPlace } from '@/services/geoapifyService';
import { matchVnAdmin } from '@/utils/vnAdminMatch';
import type { VnProvince } from '@/types/geo';
import PinDropMap, { type JumpTo } from './PinDropMap';

// Ho Chi Minh City center — same fallback JoinMatchMapScreen uses when no
// coordinates exist yet.
const DEFAULT_LATITUDE = 10.7769;
const DEFAULT_LONGITUDE = 106.7009;

type Props = {
  visible: boolean;
  initialLatitude: number | null;
  initialLongitude: number | null;
  /** Text already typed in the caller's Venue-name (or Address) field — seeds the search box so the host doesn't retype it. */
  seedQuery?: string;
  /** Venue name the caller already has — kept as the returned name unless the host picks a new search result here. */
  seedVenueName?: string;
  /** GET /geo/vn tree — passed down so the final pin can be matched to a Province/Ward code (see vnAdminMatch.ts). */
  provinces: VnProvince[];
  onCancel: () => void;
  onConfirm: (result: {
    latitude: number;
    longitude: number;
    address: string;
    /** Prefill for the caller's venue-name field — '' when nothing could be derived. */
    venueName: string;
    province?: string;
    city?: string;
  }) => void;
};

/**
 * "Find it on the map" fallback for HostMatchScreen's Location field when a
 * search doesn't hit anything in spot-backend's venue-suggestions pool
 * (SPOT-76 Host form §2). Search box (Geoapify autocomplete) jumps the map
 * to a typed address; tap/drag the pin to fine-tune from there.
 *
 * On confirm, reverse-geocodes the *final* pin position (not just whatever
 * was typed/selected in search — the host may have dragged since) to
 * prefill Address + best-effort match Province/Ward (vnAdminMatch.ts).
 * Those two always land in HostMatchScreen's still-editable dropdowns
 * (`locationLocked` stays false) — a wrong/missing match just means the
 * host corrects it by hand, never a silently-wrong locked value.
 */
export default function PinDropModal({
  visible,
  initialLatitude,
  initialLongitude,
  seedQuery,
  seedVenueName,
  provinces,
  onCancel,
  onConfirm,
}: Props) {
  const [latitude, setLatitude] = useState(initialLatitude ?? DEFAULT_LATITUDE);
  const [longitude, setLongitude] = useState(initialLongitude ?? DEFAULT_LONGITUDE);
  const [searchText, setSearchText] = useState('');
  // The name we'll hand back on confirm. Seeded from what the caller already
  // has, then overwritten only when the host picks a search result here — so
  // dragging the pin without picking never clobbers a name they typed.
  const [venueName, setVenueName] = useState('');
  const [results, setResults] = useState<GeoapifyPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [jumpTo, setJumpTo] = useState<JumpTo | null>(null);
  const [searchFieldHeight, setSearchFieldHeight] = useState(0);
  const [confirming, setConfirming] = useState(false);
  // Bumped on every open and used as PinDropMap's `key` (below) — forces a
  // full WebView remount so the visible pin always matches the freshly-
  // reset `latitude`/`longitude` state. Without this, the underlying
  // Leaflet map (built once via useMemo(..., []) so drags don't reload it
  // mid-session — see PinDropMap.tsx) kept whatever position it was left
  // at from a *previous* open, silently out of sync with the coordinates
  // this component would actually confirm/reverse-geocode: you'd see the
  // pin sitting on the right spot but "Use this location" would resolve a
  // stale one instead.
  const [openId, setOpenId] = useState(0);
  const jumpToken = useRef(0);
  // The last place the host picked from search — its admin fields are often
  // cleaner than a reverse-geocode of the final pin, so keep it as a fallback
  // for the Province/Ward match. Cleared once the pin is dragged off it.
  const pickedPlace = useRef<GeoapifyPlace | null>(null);

  // Reset per-open state each time the modal opens. Driven off a `visible`
  // effect rather than <Modal onShow> — the latter doesn't fire reliably on
  // react-native-web, which would leave stale search text from a prior open.
  const handleShow = () => {
    const seed = (seedQuery ?? '').trim();
    const hasInitialPin = initialLatitude != null && initialLongitude != null;
    setLatitude(initialLatitude ?? DEFAULT_LATITUDE);
    setLongitude(initialLongitude ?? DEFAULT_LONGITUDE);
    setVenueName(seedVenueName ?? '');
    setSearchText(seed);
    setResults([]);
    pickedPlace.current = null;
    // Show suggestions for the seeded text only when there's no pin to fine-tune
    // yet — an already-placed pin (e.g. from a DB venue suggestion) means the
    // host just wants to nudge it, not re-search over the map.
    setResultsVisible(seed.length >= 3 && !hasInitialPin);
    setJumpTo(null);
    setOpenId((id) => id + 1);
  };

  useEffect(() => {
    if (visible) handleShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    const query = searchText.trim();
    // `resultsVisible` gates the fetch too: it's true whenever the user is
    // typing/focused (onChangeText/onFocus) and when handleShow decides the
    // seeded query should show suggestions — but false when the modal opened
    // only to fine-tune an existing pin, so we don't spend a geocode call.
    if (query.length < 3 || !resultsVisible) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchAddress(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [searchText, resultsVisible]);

  // Set the pin from a picked place. Owns the coordinate update itself
  // (rather than only bumping `jumpTo`) so it also works on web, where
  // PinDropMap is a stub that never calls `onMove` back.
  function applyPlace(place: GeoapifyPlace) {
    pickedPlace.current = place;
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setVenueName(place.name || place.addressLine1 || place.formatted);
    jumpToken.current += 1;
    setJumpTo({ latitude: place.latitude, longitude: place.longitude, token: jumpToken.current });
  }

  function selectResult(place: GeoapifyPlace) {
    applyPlace(place);
    setSearchText(place.formatted);
    setResultsVisible(false);
  }

  function handleMove(lat: number, lng: number) {
    // Pin dragged/tapped away from the picked result → its admin data no
    // longer describes this spot.
    if (pickedPlace.current) {
      const moved =
        Math.abs(pickedPlace.current.latitude - lat) > 1e-5 ||
        Math.abs(pickedPlace.current.longitude - lng) > 1e-5;
      if (moved) pickedPlace.current = null;
    }
    setLatitude(lat);
    setLongitude(lng);
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const place = await reverseGeocode(latitude, longitude);
      const picked = pickedPlace.current;
      const address = place?.formatted || picked?.formatted || searchText.trim();
      const resolvedName = venueName.trim() || place?.name || place?.addressLine1 || '';
      // Prefer the reverse-geocode of the actual pin; fall back to the picked
      // search result's admin fields when reverse-geocode can't place it.
      let admin = place ? matchVnAdmin(provinces, place) : {};
      if (!admin.province && picked) admin = matchVnAdmin(provinces, picked);
      onConfirm({ latitude, longitude, address, venueName: resolvedName, province: admin.province, city: admin.city });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal testID="pin-drop-modal" visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity testID="pin-drop-cancel" style={styles.headerButton} onPress={onCancel}>
            <Ionicons name="close" size={20} color={colors.headingText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pin the venue</Text>
          <View style={styles.headerButtonSpacer} />
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchField} onLayout={(e) => setSearchFieldHeight(e.nativeEvent.layout.height)}>
            <Ionicons name="search-outline" size={16} color={colors.outline} />
            <TextInput
              testID="pin-drop-search"
              style={styles.searchInput}
              placeholder="Search an address..."
              placeholderTextColor={colors.outline}
              value={searchText}
              onChangeText={(t) => {
                setSearchText(t);
                setResultsVisible(true);
              }}
              onFocus={() => setResultsVisible(true)}
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          {resultsVisible && results.length > 0 && (
            <View style={[styles.resultsBox, { top: searchFieldHeight + spacing.xxs }]}>
              {results.map((place, index) => (
                <TouchableOpacity
                  key={`${place.formatted}-${index}`}
                  testID={`pin-drop-result-${index}`}
                  style={styles.resultRow}
                  onPress={() => selectResult(place)}
                >
                  <Ionicons name="location-outline" size={14} color={colors.outline} />
                  <Text style={styles.resultText} numberOfLines={2}>{place.formatted}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.helperText}>Search, then tap or drag the pin to the venue's exact spot.</Text>
        <View style={styles.mapWrap}>
          <PinDropMap
            key={openId}
            initialLatitude={latitude}
            initialLongitude={longitude}
            jumpTo={jumpTo}
            onMove={handleMove}
          />
        </View>
        <TouchableOpacity
          testID="pin-drop-confirm"
          style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.confirmButtonText}>Use this location</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.iconBackground,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonSpacer: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.headingText },

  searchWrap: { position: 'relative', zIndex: 20, elevation: 20, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.headingText, paddingVertical: 0 },
  resultsBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 20,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  resultText: { flex: 1, fontSize: 13, color: colors.headingText },

  helperText: { fontSize: 12, color: colors.outline, textAlign: 'center', paddingVertical: spacing.xs },
  mapWrap: { flex: 1, overflow: 'hidden' },
  confirmButton: {
    margin: spacing.md,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
  },
  confirmButtonDisabled: { opacity: 0.7 },
  confirmButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
