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
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
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
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
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
        <Text style={styles.checkingText}>{t('tournaments.create.checkingAccess')}</Text>
      </SafeAreaView>
    );
  }

  if (gate === 'blocked') {
    const stats = gateStats ?? { matchCount: 0, avgRating: 0 };
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header title={t('tournaments.create.createTitle')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.gateContent}>
          <View style={styles.gateIcon}>
            <Ionicons name="lock-closed" size={30} color={colors.textMuted} />
          </View>
          <Text style={styles.gateTitle}>{t('tournaments.create.accessRequired')}</Text>
          <Text style={styles.gateSubtitle}>{t('tournaments.create.gateSubtitle')}</Text>

          <GateRow
            pass={stats.matchCount >= MIN_HOSTED}
            label={t('tournaments.create.hostedMatches')}
            value={`${stats.matchCount} / ${MIN_HOSTED}`}
          />
          <GateRow
            pass={stats.avgRating >= MIN_RATING}
            label={t('tournaments.create.hostRating')}
            value={`${stats.avgRating.toFixed(1)} ★ (need ${MIN_RATING})`}
          />
          <Text style={styles.gateCaveat}>{t('tournaments.create.accessCaveat')}</Text>

          <TouchableOpacity testID="create-tournament-host-match" style={styles.gateCta} onPress={onHostMatch}>
            <Text style={styles.gateCtaText}>{t('tournaments.create.hostMatch')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Header title={mode === 'edit' ? t('tournaments.create.editTitle') : t('tournaments.create.createTitle')} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {locked ? (
          <View style={styles.lockBanner}>
            <Ionicons name="lock-closed" size={15} color={colors.warningText} />
            <Text style={styles.lockBannerText}>{t('tournaments.create.lockBanner').replace('{status}', init?.status?.toLowerCase() ?? '')}</Text>
          </View>
        ) : null}
        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        <Section title={t('tournaments.create.sportFormat')} icon="trophy-outline">
          <Field label={t('tournaments.create.sport')}>
            <View style={[styles.readOnlyPill]}>
              <Text style={styles.readOnlyPillText}>{sport === 'FOOTBALL' ? 'Football' : 'Badminton'}</Text>
            </View>
          </Field>
          <Field label={t('tournaments.create.format')} error={fieldErrors.format}>
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
            <Field label={t('tournaments.create.genderDivision')} error={fieldErrors.genderDivision}>
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

        <Section title={t('tournaments.create.details')} icon="information-circle-outline">
          <Field label={t('tournaments.create.title')} error={fieldErrors.title}>
            <TextInput
              testID="create-tournament-title"
              style={styles.input}
              placeholder={t('tournaments.create.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </Field>
          <Field label={t('tournaments.create.coverUrl')} error={fieldErrors.coverUrl}>
            <TextInput
              testID="create-tournament-cover"
              style={styles.input}
              placeholder={t('tournaments.join.logoUrlPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              value={coverUrl}
              onChangeText={setCoverUrl}
            />
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverPreview} resizeMode="cover" />
            ) : null}
          </Field>
          <Field label={t('tournaments.create.description')} error={fieldErrors.description}>
            <TextInput
              testID="create-tournament-description"
              style={[styles.input, styles.multiline]}
              placeholder={t('tournaments.create.descriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </Field>
        </Section>

        <Section title={t('tournaments.create.venue')} icon="location-outline">
          <Field label={t('tournaments.create.venue')} error={fieldErrors.venueName}>
            <View style={styles.locationFieldWrap}>
              <View style={styles.pickerField}>
                <TextInput
                  testID="create-tournament-venue-name"
                  style={[styles.locationInput, locked && styles.readOnlyInput]}
                  placeholder={t('tournaments.create.venuePlaceholder')}
                  placeholderTextColor={colors.textMuted}
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
                    <Ionicons name="map-outline" size={18} color={colors.primary} />
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
                          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
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
                    <Text style={styles.suggestionsEmpty}>{t('tournaments.create.noVenues')}</Text>
                  )}
                </View>
              )}
            </View>
          </Field>
          <Field label={t('tournaments.create.streetAddress')} error={fieldErrors.venueAddress}>
            <TextInput
              testID="create-tournament-venue-address"
              style={[styles.input, locked && styles.readOnlyInput]}
              placeholder={t('tournaments.create.addressPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={venueAddress}
              editable={!locked}
              onChangeText={setVenueAddress}
            />
          </Field>
          <View style={styles.row}>
            <SelectField
              label={t('tournaments.create.province')}
              placeholder={t('tournaments.create.selectProvince')}
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
              label={t('tournaments.create.ward')}
              placeholder={province ? t('tournaments.create.selectWard') : t('tournaments.create.pickProvince')}
              value={city}
              disabled={locked || locationLocked}
              onChange={(v) => !locked && setCity(v)}
              options={cityOptions}
              error={fieldErrors.city}
              containerStyle={styles.rowItem}
            />
          </View>
          {(fieldErrors.latitude || fieldErrors.longitude) && !locked ? (
            <Text style={styles.fieldError}>{t('tournaments.create.exactLocation')}</Text>
          ) : null}
          {latitude != null && longitude != null ? (
            <Text style={styles.coordHint}>{t('tournaments.create.pinnedAt').replace('{lat}', latitude.toFixed(5)).replace('{lng}', longitude.toFixed(5))}</Text>
          ) : null}
        </Section>

        <Section title={t('tournaments.create.schedule')} icon="calendar-outline">
          <DateTimeField
            label={t('tournaments.create.startsAt')}
            value={startsAt}
            disabled={locked}
            error={fieldErrors.startsAt}
            onChange={setStartsAt}
          />
          <DateTimeField label={t('tournaments.create.endsAt')} value={endsAt} disabled={locked} error={fieldErrors.endsAt} onChange={setEndsAt} />
          <DateTimeField
            label={t('tournaments.create.registrationDeadline')}
            value={registrationDeadline}
            disabled={locked}
            error={fieldErrors.registrationDeadline}
            onChange={setRegistrationDeadline}
          />
          <Text style={styles.helperText}>{t('tournaments.create.scheduleHelp')}</Text>
        </Section>

        <Section title={t('tournaments.create.teamsFees')} icon="cash-outline">
          <Field label={t('tournaments.create.maxTeams')} error={fieldErrors.maxTeams}>
            <TextInput
              testID="create-tournament-max-teams"
              style={[styles.input, mode === 'edit' && styles.readOnlyInput]}
              keyboardType="number-pad"
              value={maxTeams}
              editable={mode === 'create'}
              onChangeText={(t) => setMaxTeams(t.replace(/[^0-9]/g, ''))}
            />
          </Field>
          <Field label={t('tournaments.create.feePerTeam')} error={fieldErrors.registrationFeeVnd}>
            <TextInput
              testID="create-tournament-fee"
              style={styles.input}
              keyboardType="number-pad"
              value={registrationFeeVnd}
              onChangeText={(t) => setRegistrationFeeVnd(t.replace(/[^0-9]/g, ''))}
            />
          </Field>
          <Field label={t('tournaments.create.prizeVnd')} error={fieldErrors.prizePoolVnd}>
            <TextInput
              testID="create-tournament-prize"
              style={styles.input}
              keyboardType="number-pad"
              value={prizePoolVnd}
              onChangeText={(t) => setPrizePoolVnd(t.replace(/[^0-9]/g, ''))}
            />
          </Field>
          <Text style={styles.helperText}>{t('tournaments.create.paymentNotice')}</Text>
        </Section>

        <View style={styles.hostedByRow}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.textMuted} />
          <Text style={styles.hostedByText}>{t('tournaments.create.hostedBySpot')}</Text>
        </View>

        <SubmitButton
          label={mode === 'edit' ? t('tournaments.create.update') : t('tournaments.create.publish')}
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
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  return (
    <View style={styles.header}>
      <TouchableOpacity testID="create-tournament-back" style={styles.backButton} onPress={onBack} accessibilityLabel={t('tournaments.common.back')}>
        <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
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
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionIconCircle}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function GateRow({ pass, label, value }: { pass: boolean; label: string; value: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.gateRow}>
      <Ionicons
        name={pass ? 'checkmark-circle' : 'alert-circle'}
        size={18}
        color={pass ? colors.successText : colors.warningText}
      />
      <Text style={styles.gateRowLabel}>{label}</Text>
      <Text style={[styles.gateRowValue, { color: pass ? colors.successText : colors.warningText }]}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackgroundAlt },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screenBackgroundAlt },
  checkingText: { fontSize: 14, color: colors.textMuted },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },

  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },

  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningSurface,
    borderRadius: 12,
    padding: spacing.sm,
  },
  lockBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.warningText },

  section: { gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  sectionBody: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    gap: spacing.md,
  },

  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  fieldError: { fontSize: 12, color: colors.error },

  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  readOnlyInput: { backgroundColor: colors.tintedSurface, color: colors.textMuted },

  coverPreview: {
    marginTop: spacing.xs,
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: colors.tintedSurface,
    overflow: 'hidden',
  },

  readOnlyPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tintedSurface,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  readOnlyPillText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },

  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  locationInput: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 },
  locationFieldWrap: { gap: spacing.xxs },
  suggestionsBox: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestionsSpinner: { paddingVertical: spacing.md },
  suggestionsEmpty: {
    fontSize: 12,
    color: colors.textMuted,
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
  suggestionRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surfaceBorder },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  suggestionSubtext: { fontSize: 11, color: colors.textMuted },
  flexShrink: { flexShrink: 1 },
  pickerValue: { fontSize: 14, color: colors.textPrimary },
  pickerPlaceholder: { fontSize: 14, color: colors.textMuted },
  coordHint: { fontSize: 12, color: colors.textMuted },

  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1, gap: spacing.xxs },
  helperText: { fontSize: 12, color: colors.textMuted },

  hostedByRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  hostedByText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  gateContent: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  gateSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  gateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
  },
  gateRowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  gateRowValue: { fontSize: 14, fontWeight: '700' },
  gateCaveat: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  gateCta: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  gateCtaText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
