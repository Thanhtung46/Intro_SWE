import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import SubmitButton from '@/components/common/SubmitButton';
import DateTimeField from '@/components/tournaments/DateTimeField';
import PinDropModal from '@/components/matches/PinDropModal';
import { SelectField } from '@/components/SelectField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { GENDER_DIVISIONS, formatsForSport, needsGenderDivision } from '@/constants/tournamentFormats';
import { createTournamentSchema } from '@/schemas/createTournamentSchema';
import { getErrorMessage } from '@/services/apiErrors';
import { getMe } from '@/services/authService';
import { getHostProfile, getHostReviews, getVenueSuggestions, getVnAdminTree } from '@/services/matchService';
import { createTournament, updateTournament } from '@/services/tournamentService';
import type { Sport, VenueSuggestion } from '@/types/match';
import type { VnProvince } from '@/types/geo';
import type {
  CreateTournamentPayload,
  GenderDivision,
  TournamentDetail,
  TournamentFormat,
  UpdateTournamentPayload,
} from '@/types/tournament';

const MIN_HOSTED = 80;
const MIN_RATING = 4.5;

type Props = {
  sport: Sport;
  mode: 'create' | 'edit';
  tournamentId?: number;
  initialTournament?: TournamentDetail;
  onBack: () => void;
  onSaved: (tournamentId: number) => void;
  onHostMatch: () => void;
};

type Gate = 'checking' | 'ok' | 'blocked';

export default function CreateTournamentScreen({
  sport,
  mode,
  tournamentId,
  initialTournament,
  onBack,
  onSaved,
  onHostMatch,
}: Props) {
  const init = initialTournament;
  const locked = mode === 'edit' && (init?.status === 'ACTIVE' || init?.status === 'COMPLETED');

  const [format, setFormat] = useState<string>(init?.format ?? '');
  const [genderDivision, setGenderDivision] = useState<GenderDivision | null>(init?.genderDivision ?? null);
  const [title, setTitle] = useState(init?.title ?? '');
  const [coverUrl, setCoverUrl] = useState(init?.coverUrl ?? '');
  const [description, setDescription] = useState(init?.description ?? '');

  const [venueName, setVenueName] = useState(init?.venueName ?? '');
  const [venueAddress, setVenueAddress] = useState(init?.venueAddress ?? '');
  const [province, setProvince] = useState(init?.province ?? '');
  const [city, setCity] = useState(init?.city ?? '');
  const [latitude, setLatitude] = useState<number | null>(init?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(init?.longitude ?? null);
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [pinVisible, setPinVisible] = useState(false);
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [venueSuggestionsVisible, setVenueSuggestionsVisible] = useState(false);
  const [venueSuggestionsLoading, setVenueSuggestionsLoading] = useState(false);
  const [locationLocked, setLocationLocked] = useState(
    Boolean(init?.province && init?.city && init?.latitude != null)
  );

  const [startsAt, setStartsAt] = useState<Date | null>(init ? new Date(init.startsAt) : null);
  const [endsAt, setEndsAt] = useState<Date | null>(init ? new Date(init.endsAt) : null);
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | null>(
    init ? new Date(init.registrationDeadline) : null
  );

  const [maxTeams, setMaxTeams] = useState(init ? String(init.maxTeams) : '8');
  const [registrationFeeVnd, setRegistrationFeeVnd] = useState(init ? String(init.registrationFeeVnd) : '0');
  const [prizePoolVnd, setPrizePoolVnd] = useState(init ? String(init.prizePoolVnd) : '0');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [gate, setGate] = useState<Gate>(mode === 'create' ? 'checking' : 'ok');
  const [gateStats, setGateStats] = useState<{ matchCount: number; avgRating: number } | null>(null);

  useEffect(() => {
    getVnAdminTree()
      .then((tree) => setProvinces(tree.provinces))
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (locked) {
      setVenueSuggestions([]);
      return;
    }
    const query = venueName.trim();
    if (query.length < 1) {
      setVenueSuggestions([]);
      setVenueSuggestionsLoading(false);
      return;
    }
    setVenueSuggestionsLoading(true);
    const handle = setTimeout(() => {
      // Same pool as Host Match / Create Group — any sân already in DB.
      getVenueSuggestions(query)
        .then((rows) => setVenueSuggestions(rows ?? []))
        .catch(() => setVenueSuggestions([]))
        .finally(() => setVenueSuggestionsLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [venueName, locked]);

  const runGateCheck = useMemo(
    () => async (): Promise<Gate> => {
      try {
        const me = await getMe();
        const uid = Number(me.userId);
        if (!Number.isFinite(uid)) return 'ok'; // can't self-check — let the server decide
        const [profile, reviews] = await Promise.all([getHostProfile(uid), getHostReviews(uid, 1)]);
        const matchCount = profile.matchCount ?? 0;
        const avgRating = reviews.hostRating.avgRating ?? 0;
        setGateStats({ matchCount, avgRating });
        return matchCount >= MIN_HOSTED && avgRating >= MIN_RATING ? 'ok' : 'blocked';
      } catch {
        return 'ok';
      }
    },
    []
  );

  useEffect(() => {
    if (mode !== 'create') return;
    runGateCheck().then(setGate);
  }, [mode, runGateCheck]);

  const selectedProvince = provinces.find((p) => p.code === province);
  const cityOptions = (selectedProvince?.cities ?? []).map((c) => ({ label: c.name, value: c.code }));
  const formatOptions = useMemo(() => formatsForSport(sport), [sport]);

  function applyVenueSuggestion(suggestion: VenueSuggestion) {
    setVenueName(suggestion.venueName);
    setVenueAddress(suggestion.venueAddress);
    if (suggestion.province) setProvince(suggestion.province);
    if (suggestion.city) setCity(suggestion.city);
    setLatitude(suggestion.latitude);
    setLongitude(suggestion.longitude);
    setVenueSuggestionsVisible(false);
    setLocationLocked(true);
  }

  const handleSubmit = async () => {
    setSubmitError('');
    const parsed = createTournamentSchema.safeParse({
      sport,
      format,
      genderDivision: needsGenderDivision(sport) ? genderDivision : null,
      title,
      coverUrl,
      description,
      venueName,
      venueAddress,
      province,
      city,
      latitude,
      longitude,
      startsAt: startsAt ? startsAt.toISOString() : '',
      endsAt: endsAt ? endsAt.toISOString() : '',
      registrationDeadline: registrationDeadline ? registrationDeadline.toISOString() : '',
      maxTeams,
      registrationFeeVnd,
      prizePoolVnd,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setSubmitError('Please fix the highlighted fields.');
      return;
    }
    setFieldErrors({});
    const v = parsed.data;

    setIsSubmitting(true);
    try {
      if (mode === 'edit' && tournamentId != null) {
        const patch: UpdateTournamentPayload = {
          title: v.title,
          coverUrl: v.coverUrl,
          description: v.description,
          registrationFeeVnd: v.registrationFeeVnd,
          prizePoolVnd: v.prizePoolVnd,
        };
        if (!locked) {
          patch.venueName = v.venueName;
          patch.venueAddress = v.venueAddress;
          patch.province = v.province;
          patch.city = v.city;
          patch.latitude = v.latitude;
          patch.longitude = v.longitude;
          patch.startsAt = v.startsAt;
          patch.endsAt = v.endsAt;
          patch.registrationDeadline = v.registrationDeadline;
        }
        const saved = await updateTournament(tournamentId, patch);
        onSaved(saved.tournamentId);
        return;
      }

      const payload: CreateTournamentPayload = {
        sport,
        format: v.format as TournamentFormat,
        genderDivision: needsGenderDivision(sport) ? v.genderDivision : undefined,
        title: v.title,
        coverUrl: v.coverUrl,
        description: v.description,
        venueName: v.venueName,
        venueAddress: v.venueAddress,
        province: v.province,
        city: v.city,
        latitude: v.latitude,
        longitude: v.longitude,
        startsAt: v.startsAt,
        endsAt: v.endsAt,
        registrationDeadline: v.registrationDeadline,
        maxTeams: v.maxTeams,
        registrationFeeVnd: v.registrationFeeVnd,
        prizePoolVnd: v.prizePoolVnd,
      };
      const saved = await createTournament(payload);
      onSaved(saved.tournamentId);
    } catch (err) {
      // FE pre-check can over-read (matchCount counts non-completed kèo); the
      // server's 403 is authoritative. Re-check and swap to the gate view if we
      // now fall short, otherwise surface the error.
      if (mode === 'create') {
        const recheck = await runGateCheck();
        if (recheck === 'blocked') {
          setGate('blocked');
          return;
        }
      }
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (gate === 'checking') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <Text style={styles.checkingText}>Checking organizer access…</Text>
      </SafeAreaView>
    );
  }

  if (gate === 'blocked') {
    const stats = gateStats ?? { matchCount: 0, avgRating: 0 };
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header title="Create Tournament" onBack={onBack} />
        <ScrollView contentContainerStyle={styles.gateContent}>
          <View style={styles.gateIcon}>
            <Ionicons name="lock-closed" size={30} color={colors.outline} />
          </View>
          <Text style={styles.gateTitle}>Organizer access required</Text>
          <Text style={styles.gateSubtitle}>
            Hosting a tournament unlocks once you have a strong track record hosting pickup matches.
          </Text>

          <GateRow
            pass={stats.matchCount >= MIN_HOSTED}
            label="Hosted matches"
            value={`${stats.matchCount} / ${MIN_HOSTED}`}
          />
          <GateRow
            pass={stats.avgRating >= MIN_RATING}
            label="Host rating"
            value={`${stats.avgRating.toFixed(1)} ★ (need ${MIN_RATING})`}
          />
          <Text style={styles.gateCaveat}>Your organizer status is confirmed when you publish.</Text>

          <TouchableOpacity testID="create-tournament-host-match" style={styles.gateCta} onPress={onHostMatch}>
            <Text style={styles.gateCtaText}>Host a Match</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Header title={mode === 'edit' ? 'Edit Tournament' : 'Create Tournament'} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {locked ? (
          <View style={styles.lockBanner}>
            <Ionicons name="lock-closed" size={15} color={colors.orange} />
            <Text style={styles.lockBannerText}>
              This tournament is {init?.status?.toLowerCase()} — venue and schedule are locked.
            </Text>
          </View>
        ) : null}
        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        <Section title="Sport & Format" icon="trophy-outline">
          <Field label="Sport">
            <View style={[styles.readOnlyPill]}>
              <Text style={styles.readOnlyPillText}>{sport === 'FOOTBALL' ? 'Football' : 'Badminton'}</Text>
            </View>
          </Field>
          <Field label="Format" error={fieldErrors.format}>
            <View style={styles.chipRow}>
              {formatOptions.map((opt) => {
                const active = opt.value === format;
                const disabled = mode === 'edit';
                return (
                  <TouchableOpacity
                    key={opt.value}
                    testID={`create-tournament-format-${opt.value}`}
                    style={[styles.chip, active && styles.chipActive, disabled && !active && styles.chipDisabled]}
                    onPress={() => !disabled && setFormat(opt.value)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>
          {needsGenderDivision(sport) && (
            <Field label="Gender Division" error={fieldErrors.genderDivision}>
              <View style={styles.chipRow}>
                {GENDER_DIVISIONS.map((opt) => {
                  const active = opt.value === genderDivision;
                  const disabled = mode === 'edit';
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      testID={`create-tournament-gender-${opt.value}`}
                      style={[styles.chip, active && styles.chipActive, disabled && !active && styles.chipDisabled]}
                      onPress={() => !disabled && setGenderDivision(opt.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
          )}
        </Section>

        <Section title="Details" icon="information-circle-outline">
          <Field label="Tournament Title" error={fieldErrors.title}>
            <TextInput
              testID="create-tournament-title"
              style={styles.input}
              placeholder="e.g. Saigon Amateur Cup 2026"
              placeholderTextColor={colors.outline}
              value={title}
              onChangeText={setTitle}
            />
          </Field>
          <Field label="Cover Image URL" error={fieldErrors.coverUrl}>
            <TextInput
              testID="create-tournament-cover"
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={colors.outline}
              autoCapitalize="none"
              keyboardType="url"
              value={coverUrl}
              onChangeText={setCoverUrl}
            />
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverPreview} resizeMode="cover" />
            ) : null}
          </Field>
          <Field label="Description" error={fieldErrors.description}>
            <TextInput
              testID="create-tournament-description"
              style={[styles.input, styles.multiline]}
              placeholder="Overview, rules, and competition structure (groups, knockout…). There is no separate Rules tab."
              placeholderTextColor={colors.outline}
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </Field>
        </Section>

        <Section title="Venue" icon="location-outline">
          <Field label="Venue Name" error={fieldErrors.venueName}>
            <View style={styles.locationFieldWrap}>
              <View style={styles.pickerField}>
                <TextInput
                  testID="create-tournament-venue-name"
                  style={[styles.locationInput, locked && styles.readOnlyInput]}
                  placeholder="Search or enter venue name"
                  placeholderTextColor={colors.outline}
                  value={venueName}
                  editable={!locked}
                  onChangeText={(t) => {
                    setVenueName(t);
                    setVenueSuggestionsVisible(true);
                    setLocationLocked(false);
                  }}
                  onFocus={() => !locked && setVenueSuggestionsVisible(true)}
                />
                {!locked && (
                  <TouchableOpacity testID="create-tournament-open-map" onPress={() => setPinVisible(true)}>
                    <Ionicons name="map-outline" size={18} color={colors.primaryDark} />
                  </TouchableOpacity>
                )}
              </View>
              {!locked && venueSuggestionsVisible && venueName.trim().length > 0 && (
                <View testID="create-tournament-venue-suggestions" style={styles.suggestionsBox}>
                  {venueSuggestionsLoading ? (
                    <ActivityIndicator style={styles.suggestionsSpinner} color={colors.primary} />
                  ) : venueSuggestions.length > 0 ? (
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {venueSuggestions.map((s, index) => (
                        <TouchableOpacity
                          key={`${s.venueName}-${index}`}
                          testID={`create-tournament-venue-suggestion-${index}`}
                          style={[styles.suggestionRow, index > 0 && styles.suggestionRowBorder]}
                          onPress={() => applyVenueSuggestion(s)}
                        >
                          <Ionicons name="location-outline" size={14} color={colors.outline} />
                          <View style={styles.flexShrink}>
                            <Text style={styles.suggestionText} numberOfLines={1}>
                              {s.venueName}
                            </Text>
                            <Text style={styles.suggestionSubtext} numberOfLines={1}>
                              {s.venueAddress}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.suggestionsEmpty}>No saved venues match. Keep typing or pick on the map.</Text>
                  )}
                </View>
              )}
            </View>
          </Field>
          <Field label="Street Address" error={fieldErrors.venueAddress}>
            <TextInput
              testID="create-tournament-venue-address"
              style={[styles.input, locked && styles.readOnlyInput]}
              placeholder="123 Sports Blvd"
              placeholderTextColor={colors.outline}
              value={venueAddress}
              editable={!locked}
              onChangeText={setVenueAddress}
            />
          </Field>
          <View style={styles.row}>
            <SelectField
              label="Province/City"
              placeholder="Select province"
              value={province}
              disabled={locked || locationLocked}
              onChange={(v) => {
                if (locked) return;
                setProvince(v);
                setCity('');
              }}
              options={provinces.map((p) => ({ label: p.name, value: p.code }))}
              error={fieldErrors.province}
              containerStyle={styles.rowItem}
            />
            <SelectField
              label="Ward/Commune"
              placeholder={province ? 'Select ward' : 'Pick province'}
              value={city}
              disabled={locked || locationLocked}
              onChange={(v) => !locked && setCity(v)}
              options={cityOptions}
              error={fieldErrors.city}
              containerStyle={styles.rowItem}
            />
          </View>
          {(fieldErrors.latitude || fieldErrors.longitude) && !locked ? (
            <Text style={styles.fieldError}>Set the exact location on the map.</Text>
          ) : null}
          {latitude != null && longitude != null ? (
            <Text style={styles.coordHint}>
              Pinned at {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          ) : null}
        </Section>

        <Section title="Schedule" icon="calendar-outline">
          <DateTimeField
            label="Starts At"
            value={startsAt}
            disabled={locked}
            error={fieldErrors.startsAt}
            onChange={setStartsAt}
          />
          <DateTimeField label="Ends At" value={endsAt} disabled={locked} error={fieldErrors.endsAt} onChange={setEndsAt} />
          <DateTimeField
            label="Registration Deadline"
            value={registrationDeadline}
            disabled={locked}
            error={fieldErrors.registrationDeadline}
            onChange={setRegistrationDeadline}
          />
          <Text style={styles.helperText}>Deadline ≤ start ≤ end.</Text>
        </Section>

        <Section title="Teams & Fees" icon="cash-outline">
          <Field label="Max Teams" error={fieldErrors.maxTeams}>
            <TextInput
              testID="create-tournament-max-teams"
              style={[styles.input, mode === 'edit' && styles.readOnlyInput]}
              keyboardType="number-pad"
              value={maxTeams}
              editable={mode === 'create'}
              onChangeText={(t) => setMaxTeams(t.replace(/[^0-9]/g, ''))}
            />
          </Field>
          <Field label="Registration Fee (VND / team)" error={fieldErrors.registrationFeeVnd}>
            <TextInput
              testID="create-tournament-fee"
              style={styles.input}
              keyboardType="number-pad"
              value={registrationFeeVnd}
              onChangeText={(t) => setRegistrationFeeVnd(t.replace(/[^0-9]/g, ''))}
            />
          </Field>
          <Field label="Prize Pool (VND)" error={fieldErrors.prizePoolVnd}>
            <TextInput
              testID="create-tournament-prize"
              style={styles.input}
              keyboardType="number-pad"
              value={prizePoolVnd}
              onChangeText={(t) => setPrizePoolVnd(t.replace(/[^0-9]/g, ''))}
            />
          </Field>
          <Text style={styles.helperText}>Display only — no payment is collected in-app.</Text>
        </Section>

        <View style={styles.hostedByRow}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.outline} />
          <Text style={styles.hostedByText}>Hosted by SPOT</Text>
        </View>

        <SubmitButton
          label={mode === 'edit' ? 'Save Changes' : 'Create Tournament'}
          loading={isSubmitting}
          onPress={handleSubmit}
        />
      </ScrollView>

      <PinDropModal
        visible={pinVisible}
        initialLatitude={latitude}
        initialLongitude={longitude}
        seedQuery={venueName.trim() || venueAddress.trim()}
        seedVenueName={venueName}
        provinces={provinces}
        onCancel={() => setPinVisible(false)}
        onConfirm={({ latitude: lat, longitude: lng, address, venueName: pickedName, province: mp, city: mc }) => {
          setLatitude(lat);
          setLongitude(lng);
          if (pickedName) setVenueName(pickedName);
          if (address) setVenueAddress(address);
          if (mp) {
            setProvince(mp);
            setCity(mc ?? '');
            setLocationLocked(true);
          }
          setVenueSuggestionsVisible(false);
          setPinVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity testID="create-tournament-back" style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={18} color={colors.headingText} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionIconCircle}>
          <Ionicons name={icon} size={16} color={colors.primaryDark} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function GateRow({ pass, label, value }: { pass: boolean; label: string; value: string }) {
  return (
    <View style={styles.gateRow}>
      <Ionicons
        name={pass ? 'checkmark-circle' : 'alert-circle'}
        size={18}
        color={pass ? colors.success : colors.amber}
      />
      <Text style={styles.gateRowLabel}>{label}</Text>
      <Text style={[styles.gateRowValue, { color: pass ? colors.success : colors.amber }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screenBackground },
  checkingText: { fontSize: 14, color: colors.outline },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.headingText },

  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },

  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.orangeSoft,
    borderRadius: 12,
    padding: spacing.sm,
  },
  lockBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.orange },

  section: { gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.headingText },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.md,
  },

  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.bodyText },
  fieldError: { fontSize: 12, color: colors.error },

  input: {
    borderWidth: 1,
    borderColor: colors.dotInactive,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.headingText,
    backgroundColor: colors.white,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  readOnlyInput: { backgroundColor: colors.formScreenBackground, color: colors.outline },

  coverPreview: {
    marginTop: spacing.xs,
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: colors.iconBackground,
    overflow: 'hidden',
  },

  readOnlyPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.formScreenBackground,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  readOnlyPillText: { fontSize: 13, fontWeight: '600', color: colors.outline },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.dotInactive,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.bodyText },
  chipTextActive: { color: colors.white },

  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.dotInactive,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  locationInput: { flex: 1, fontSize: 14, color: colors.headingText, paddingVertical: 0 },
  locationFieldWrap: { gap: spacing.xxs },
  suggestionsBox: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  suggestionsSpinner: { paddingVertical: spacing.md },
  suggestionsEmpty: {
    fontSize: 12,
    color: colors.outline,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  suggestionRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.headingText },
  suggestionSubtext: { fontSize: 11, color: colors.outline },
  flexShrink: { flexShrink: 1 },
  pickerValue: { fontSize: 14, color: colors.headingText },
  pickerPlaceholder: { fontSize: 14, color: colors.outline },
  coordHint: { fontSize: 12, color: colors.outline },

  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1, gap: spacing.xxs },
  helperText: { fontSize: 12, color: colors.outline },

  hostedByRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  hostedByText: { fontSize: 13, fontWeight: '600', color: colors.outline },

  gateContent: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateTitle: { fontSize: 20, fontWeight: '800', color: colors.headingText },
  gateSubtitle: { fontSize: 14, color: colors.bodyText, textAlign: 'center', lineHeight: 20 },
  gateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  gateRowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.headingText },
  gateRowValue: { fontSize: 14, fontWeight: '700' },
  gateCaveat: { fontSize: 12, color: colors.outline, textAlign: 'center' },
  gateCta: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  gateCtaText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
