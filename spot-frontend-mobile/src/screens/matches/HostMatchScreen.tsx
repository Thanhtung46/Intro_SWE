import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  findNodeHandle,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import SubmitButton from '@/components/common/SubmitButton';
import { groupSkillLabel, groupSkillTier } from '@/components/groups/groupPresentation';
import PinDropModal from '@/components/matches/PinDropModal';
import { SelectField } from '@/components/SelectField';
import { spacing } from '@/constants/spacing';
import { formatsForSport, minPlayersForFormat } from '@/constants/matchFormats';
import { skillsForSport } from '@/constants/matchSkills';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { getMe } from '@/services/authService';
import {
  getErrorMessage,
  getMatchDetail,
  getVenueSuggestions,
  getVnAdminTree,
  hostMatch,
  hostMatchBulk,
  updateMatch,
} from '@/services/matchService';
import { hostMatchSchema } from '@/schemas/hostMatchSchema';
import { formatDisplayDate, parseHm, parseIsoDate, toHm, toIsoDate } from '@/utils/dateTime';
import type { TranslationKey } from '@/i18n/translations';
import type { CreateMatchBulkPayload, CreateMatchPayload, MatchFormat, Sport, VenueSuggestion } from '@/types/match';
import type { VnProvince } from '@/types/geo';

type Props = {
  sport: Sport;
  /** When set, form loads that match and PATCHes instead of creating. */
  matchId?: number;
  onBack: () => void;
  onCreated: () => void;
  onUpdated?: () => void;
};

function skillCodesFromRange(sport: Sport, skillMin: string | null, skillMax: string | null, allLevels: boolean): string[] {
  if (allLevels || !skillMin) return [];
  const skills = skillsForSport(sport);
  const minRank = skills.find((s) => s.code === skillMin)?.rank;
  const maxRank = skills.find((s) => s.code === (skillMax || skillMin))?.rank ?? minRank;
  if (minRank == null || maxRank == null) return [];
  return skills.filter((s) => s.rank >= minRank && s.rank <= maxRank).map((s) => s.code);
}

type CourtField = { key: string; name: string };

type Translate = (key: TranslationKey) => string;

function getWeekdayLabels(t: Translate): string[] {
  return [
    t('matches.host.weekday.sun'), t('matches.host.weekday.mon'), t('matches.host.weekday.tue'),
    t('matches.host.weekday.wed'), t('matches.host.weekday.thu'), t('matches.host.weekday.fri'),
    t('matches.host.weekday.sat'),
  ];
}
const BULK_MAX_SCHEDULES = 100;

/** Form top→bottom order — used to scroll to the first invalid field. */
const FIELD_ORDER = [
  'title',
  'venueName',
  'venueAddress',
  'province',
  'city',
  'date',
  'timeFrom',
  'timeTo',
  'courts',
  'skillCodes',
  'priceMin',
  'priceMax',
  'recurringWeekdays',
  'recurringWeeks',
  'format',
  'maxPlayers',
  'coverUrl',
] as const;

function getFieldLabels(t: Translate): Record<string, string> {
  return {
    title: t('matches.host.fieldLabel.title'),
    venueName: t('matches.host.fieldLabel.venueName'),
    venueAddress: t('matches.host.fieldLabel.venueAddress'),
    province: t('matches.host.fieldLabel.province'),
    city: t('matches.host.fieldLabel.city'),
    date: t('matches.host.fieldLabel.date'),
    timeFrom: t('matches.host.fieldLabel.timeFrom'),
    timeTo: t('matches.host.fieldLabel.timeTo'),
    courts: t('matches.host.fieldLabel.courts'),
    skillCodes: t('matches.host.fieldLabel.skillCodes'),
    priceMin: t('matches.host.fieldLabel.priceMin'),
    priceMax: t('matches.host.fieldLabel.priceMax'),
    recurringWeekdays: t('matches.host.fieldLabel.recurringWeekdays'),
    recurringWeeks: t('matches.host.fieldLabel.recurringWeeks'),
    format: t('matches.host.fieldLabel.format'),
    maxPlayers: t('matches.host.fieldLabel.maxPlayers'),
    coverUrl: t('matches.host.fieldLabel.coverUrl'),
  };
}

// @react-native-community/datetimepicker has no web build, so on web fall
// back to the browser's own native date/time inputs. `date` is held as an
// ISO yyyy-mm-dd string and `timeFrom`/`timeTo` as HH:mm — both are exactly
// the value format of <input type="date"> / <input type="time">.
const IS_WEB = Platform.OS === 'web';

function WebDateTimeInput(props: { type: 'date' | 'time'; value: string; min?: string; onChange: (v: string) => void; colors: ThemeColors }) {
  // react-native-web renders unrecognised lowercase JSX tags as raw DOM nodes.
  return (
    <input
      type={props.type}
      value={props.value}
      min={props.min}
      onChange={(e: { target: { value: string } }) => props.onChange(e.target.value)}
      style={{
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: props.colors.chromeBorder,
        borderRadius: 10,
        padding: spacing.sm,
        fontSize: 14,
        color: props.colors.textPrimary,
        backgroundColor: props.colors.surface,
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
}

let courtKeySeq = 0;
function nextCourtKey(): string {
  courtKeySeq += 1;
  return `court-${courtKeySeq}`;
}

/**
 * Host a Match (Figma node 99:2, SPOT-76). Contract locked in
 * spot-backend/CLAUDE.md "Host form 99:2" — sport comes from the Homepage
 * tab (99:2 §1), host name/phone are read-only from GET /auth/me (§3),
 * multi-day is always false (§4, no UI), fee is always on (§8), cover image
 * is a pasted URL (no FE upload pipeline exists, §11).
 *
 * Local useState instead of react-hook-form: this form is almost entirely
 * custom widgets (date/time pickers, dynamic court list, skill/format
 * chips, weekday multi-select) rather than plain text inputs — matches
 * FilterSheet.tsx's precedent for the same tradeoff in this domain, see
 * that file's header comment. Validated with hostMatchSchema.safeParse()
 * on submit instead of zodResolver.
 *
 * "Allow Player Invitations" / "Squad Visibility" (seen in a later Figma
 * pass) are intentionally NOT here — spot-backend's createMatchSchema has
 * no such fields, and "Squad Visibility" has no backend concept at all
 * (every kèo is public); adding either would be a UI control with nothing
 * behind it.
 */
export default function HostMatchScreen({ sport, matchId, onBack, onCreated, onUpdated }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const isEdit = matchId != null;
  // Host identity (read-only)
  const [hostName, setHostName] = useState('');
  const [hostPhone, setHostPhone] = useState('');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    isEdit ? 'loading' : 'ready'
  );
  const [loadError, setLoadError] = useState('');
  const [filledCount, setFilledCount] = useState(1);
  const lockCoreFields = isEdit && filledCount > 1;

  // Location
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [venueSuggestionsVisible, setVenueSuggestionsVisible] = useState(false);
  const [pinPickerVisible, setPinPickerVisible] = useState(false);
  // True once Province/Ward were filled from a trusted DB venue suggestion
  // (applyVenueSuggestion) — greys them out read-only. Editing the venue
  // name again, or dropping a pin on the map instead, unlocks them so the
  // host can pick manually (no reverse-geocoding — see PinDropModal).
  const [locationLocked, setLocationLocked] = useState(false);

  // Basics
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  // Schedule
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeFromPicker, setShowTimeFromPicker] = useState(false);
  const [showTimeToPicker, setShowTimeToPicker] = useState(false);

  // Courts — editable list in place (no separate draft field).
  const [courts, setCourts] = useState<CourtField[]>([{ key: nextCourtKey(), name: '' }]);

  // Skill
  const [allLevels, setAllLevels] = useState(false);
  const [skillCodes, setSkillCodes] = useState<string[]>([]);

  // Advanced
  const [format, setFormat] = useState<MatchFormat | ''>('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [joinMode, setJoinMode] = useState<'AUTO' | 'APPROVAL'>('AUTO');

  // Fee
  const [feeType, setFeeType] = useState<'GENDER_RANGE' | 'SPLIT_EVENLY'>('GENDER_RANGE');
  const [priceMin, setPriceMin] = useState(''); // female price (GENDER_RANGE) or total (SPLIT_EVENLY)
  const [priceMax, setPriceMax] = useState(''); // male price (GENDER_RANGE only)

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeekdays, setRecurringWeekdays] = useState<number[]>([]);
  const [recurringWeeks, setRecurringWeeks] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const fieldRefs = useRef<Record<string, View | null>>({});

  const setFieldRef = (key: string) => (node: View | null) => {
    fieldRefs.current[key] = node;
  };

  const scrollToFirstError = (errors: Record<string, string>) => {
    const firstKey =
      FIELD_ORDER.find((key) => errors[key]) ?? Object.keys(errors)[0];
    if (!firstKey) return;
    const fieldNode = fieldRefs.current[firstKey];
    const contentNode = contentRef.current;
    if (!fieldNode || !contentNode) return;
    const relativeTo = findNodeHandle(contentNode);
    if (relativeTo == null) return;
    // Defer until after error text mounts (layout can shift slightly).
    requestAnimationFrame(() => {
      fieldNode.measureLayout(
        relativeTo,
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.md), animated: true });
        },
        () => {}
      );
    });
  };

  useEffect(() => {
    getMe().then((profile) => {
      setHostName(profile.fullName);
      setHostPhone(profile.phoneNumber ?? '');
    }).catch(() => {});
    getVnAdminTree().then((tree) => setProvinces(tree.provinces)).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (matchId == null) return;
    let cancelled = false;
    setLoadStatus('loading');
    getMatchDetail(matchId)
      .then((detail) => {
        if (cancelled) return;
        if (!detail.isHost) {
          setLoadError(t('matches.host.onlyHostCanEdit'));
          setLoadStatus('error');
          return;
        }
        const m = detail.match;
        if (m.status === 'CANCELLED' || m.status === 'COMPLETED') {
          setLoadError(t('matches.host.statusCannotBeEdited').replace('{status}', m.status.toLowerCase()));
          setLoadStatus('error');
          return;
        }
        if (new Date(m.startsAt).getTime() <= Date.now()) {
          setLoadError(t('matches.host.cannotEditStarted'));
          setLoadStatus('error');
          return;
        }
        setFilledCount(m.filledCount);
        setVenueName(m.venueName);
        setVenueAddress(m.venueAddress);
        setProvince(m.province ?? '');
        setCity(m.city ?? '');
        setLatitude(m.latitude);
        setLongitude(m.longitude);
        setLocationLocked(Boolean(m.province && m.city));
        setTitle(m.title);
        setNotes(m.notes ?? '');
        setCoverUrl(m.coverUrl ?? '');
        const starts = new Date(m.startsAt);
        const ends = new Date(m.endsAt);
        setDate(toIsoDate(starts));
        setTimeFrom(toHm(starts));
        setTimeTo(toHm(ends));
        setCourts(
          m.courts.length
            ? m.courts.map((c) => ({ key: nextCourtKey(), name: c.name ?? '' }))
            : [{ key: nextCourtKey(), name: '' }]
        );
        setAllLevels(m.allLevels);
        setSkillCodes(skillCodesFromRange(m.sport, m.skillMin, m.skillMax, m.allLevels));
        setFormat(m.format);
        setMaxPlayers(String(m.maxPlayers));
        setJoinMode(m.joinMode);
        setFeeType(m.feeType);
        setPriceMin(m.priceMin != null ? String(m.priceMin) : '');
        setPriceMax(m.priceMax != null ? String(m.priceMax) : '');
        setIsRecurring(false);
        setLoadStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(getErrorMessage(err));
        setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    const query = venueName.trim();
    if (query.length < 2) {
      setVenueSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      getVenueSuggestions(query, sport)
        .then(setVenueSuggestions)
        .catch(() => setVenueSuggestions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [venueName, sport]);

  const selectedProvince = provinces.find((p) => p.code === province);
  const cityOptions = (selectedProvince?.cities ?? []).map((c) => ({ label: c.name, value: c.code }));

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

  function toggleSkill(code: string) {
    setSkillCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function toggleWeekday(day: number) {
    setRecurringWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function addCourt() {
    setCourts((prev) => [...prev, { key: nextCourtKey(), name: '' }]);
  }

  function removeCourt(key: string) {
    setCourts((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  }

  function updateCourtName(key: string, name: string) {
    setCourts((prev) => prev.map((c) => (c.key === key ? { ...c, name } : c)));
    setFieldErrors((prev) => {
      if (!prev.courts) return prev;
      const next = { ...prev };
      delete next.courts;
      return next;
    });
  }

  const courtDuplicateWarning = useMemo(() => {
    const names = courts.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
    if (names.length < 2) return null;
    return new Set(names).size !== names.length ? t('matches.host.courtNamesUnique') : null;
  }, [courts, t]);

  // Expands the (anchor date, weekdays, weekCount) trio into concrete
  // schedule dates — starts at the anchor's own week, walks forward
  // weekCount*7 days, keeps any day whose weekday is selected.
  const recurringPreviewCount = useMemo(() => {
    if (!isRecurring || !date || recurringWeekdays.length === 0) return 0;
    const weeks = Number(recurringWeeks);
    if (!Number.isFinite(weeks) || weeks < 1) return 0;
    const anchor = parseIsoDate(date);
    let count = 0;
    for (let i = 0; i < weeks * 7; i += 1) {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      if (recurringWeekdays.includes(d.getDay())) count += 1;
    }
    return Math.min(count, BULK_MAX_SCHEDULES);
  }, [isRecurring, date, recurringWeekdays, recurringWeeks]);

  function buildSchedules(): { startsAt: string; endsAt: string }[] {
    const anchor = parseIsoDate(date);
    const [fromH, fromM] = timeFrom.split(':').map(Number);
    const [toH, toM] = timeTo.split(':').map(Number);
    const weeks = Number(recurringWeeks) || 1;
    const dates: Date[] = [];
    for (let i = 0; i < weeks * 7 && dates.length < BULK_MAX_SCHEDULES; i += 1) {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      if (recurringWeekdays.includes(d.getDay())) dates.push(d);
    }
    return dates.map((d) => {
      const starts = new Date(d);
      starts.setHours(fromH, fromM, 0, 0);
      const ends = new Date(d);
      ends.setHours(toH, toM, 0, 0);
      return { startsAt: starts.toISOString(), endsAt: ends.toISOString() };
    });
  }

  function handleDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setDate(toIsoDate(selected));
  }
  function handleTimeFromChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowTimeFromPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setTimeFrom(toHm(selected));
  }
  function handleTimeToChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowTimeToPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setTimeTo(toHm(selected));
  }

  async function handleSubmit() {
    setSubmitError('');
    const skillRanks = skillsForSport(sport);
    const selectedRanks = skillRanks.filter((s) => skillCodes.includes(s.code)).map((s) => s.rank);
    const skillMin = selectedRanks.length ? skillRanks.find((s) => s.rank === Math.min(...selectedRanks))?.code : undefined;
    const skillMax = selectedRanks.length ? skillRanks.find((s) => s.rank === Math.max(...selectedRanks))?.code : undefined;

    const parsed = hostMatchSchema.safeParse({
      venueName,
      venueAddress,
      province,
      city,
      latitude,
      longitude,
      title,
      notes: notes || undefined,
      coverUrl: coverUrl || undefined,
      date,
      timeFrom,
      timeTo,
      courts: courts.map((c) => ({ name: c.name })),
      allLevels,
      skillCodes,
      format,
      maxPlayers,
      joinMode,
      feeType,
      priceMin: priceMin === '' ? undefined : priceMin,
      priceMax: priceMax === '' ? undefined : priceMax,
      isRecurring: isEdit ? false : isRecurring,
      recurringWeekdays: isEdit ? [] : recurringWeekdays,
      recurringWeeks: isEdit || recurringWeeks === '' ? undefined : recurringWeeks,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      const fieldLabels = getFieldLabels(t);
      const orderedKeys = [
        ...FIELD_ORDER.filter((key) => errors[key]),
        ...Object.keys(errors).filter((key) => !FIELD_ORDER.includes(key as (typeof FIELD_ORDER)[number])),
      ];
      const summary = orderedKeys
        .slice(0, 3)
        .map((key) => `${fieldLabels[key] ?? key}: ${errors[key]}`)
        .join('\n');
      setSubmitError(summary || t('matches.host.pleaseFixHighlighted'));
      scrollToFirstError(errors);
      return;
    }
    setFieldErrors({});

    const values = parsed.data;
    // Edit is always a single occurrence — never bulk/recurring.
    const editMode = isEdit && matchId != null;
    const template: Omit<CreateMatchPayload, 'startsAt' | 'endsAt'> = {
      sport,
      format: values.format as MatchFormat,
      title: values.title,
      notes: values.notes ?? null,
      coverUrl: values.coverUrl || null,
      venueName: values.venueName,
      venueAddress: values.venueAddress,
      province: values.province,
      city: values.city,
      latitude: values.latitude,
      longitude: values.longitude,
      isMultiDay: false,
      isRecurring: editMode ? false : values.isRecurring,
      maxPlayers: values.maxPlayers,
      allLevels: values.allLevels,
      skillMin: values.allLevels ? undefined : skillMin,
      skillMax: values.allLevels ? undefined : skillMax,
      feeType: values.feeType,
      priceMin: values.priceMin,
      priceMax: values.feeType === 'GENDER_RANGE' ? values.priceMax : undefined,
      joinMode: values.joinMode,
      courts: values.courts,
    };

    setIsSubmitting(true);
    try {
      const [fromH, fromM] = values.timeFrom.split(':').map(Number);
      const [toH, toM] = values.timeTo.split(':').map(Number);
      const startsAtDate = parseIsoDate(values.date);
      startsAtDate.setHours(fromH, fromM, 0, 0);
      const endsAtDate = parseIsoDate(values.date);
      endsAtDate.setHours(toH, toM, 0, 0);
      const startsAt = startsAtDate.toISOString();
      const endsAt = endsAtDate.toISOString();

      if (editMode) {
        await updateMatch(matchId, { ...template, startsAt, endsAt });
        if (onUpdated) onUpdated();
        else onCreated();
      } else if (values.isRecurring) {
        const schedules = buildSchedules();
        const payload: CreateMatchBulkPayload = { template, schedules };
        const result = await hostMatchBulk(payload);
        if (result.failed.length > 0) {
          Alert.alert(
            t('matches.host.someMatchesNotCreatedTitle'),
            t('matches.host.someMatchesNotCreatedMessage')
              .replace('{created}', String(result.totalCreated))
              .replace('{requested}', String(result.totalRequested))
              .replace('{failedCount}', String(result.failed.length))
          );
        } else {
          Alert.alert(t('matches.host.matchesCreatedTitle'), t('matches.host.matchesCreatedMessage').replace('{created}', String(result.totalCreated)));
        }
        if (result.totalCreated > 0) onCreated();
      } else {
        await hostMatch({ ...template, startsAt, endsAt });
        onCreated();
      }
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadStatus === 'loading') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (loadStatus === 'error') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ErrorBanner message={loadError || t('matches.host.couldNotLoadMatch')} onRetry={onBack} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="host-match-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? t('matches.host.editMatchTitle') : t('matches.host.hostMatchTitle')}</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View ref={contentRef} collapsable={false}>
        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        <Section title={t('matches.host.sectionGeneralInfo')} icon="information-circle-outline" colors={colors} styles={styles}>
          <Field label={t('matches.host.matchTitle')} error={fieldErrors.title} fieldKey="title" setFieldRef={setFieldRef} styles={styles}>
            <TextInput
              testID="host-match-title"
              style={styles.input}
              placeholder={t('matches.host.matchTitlePlaceholder')}
              placeholderTextColor={colors.outlineMuted}
              value={title}
              onChangeText={setTitle}
            />
          </Field>
          <Field label={t('matches.host.description')} styles={styles}>
            <TextInput
              testID="host-match-notes"
              style={[styles.input, styles.multilineInput]}
              placeholder={t('matches.host.descriptionPlaceholder')}
              placeholderTextColor={colors.outlineMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </Field>

          <Field label={t('matches.host.venueName')} error={fieldErrors.venueName} fieldKey="venueName" setFieldRef={setFieldRef} styles={styles}>
            <View style={styles.locationFieldWrap}>
              <View style={styles.pickerField}>
                <TextInput
                  testID="host-match-venue-name"
                  style={styles.locationInput}
                  placeholder={t('matches.host.venueNamePlaceholder')}
                  placeholderTextColor={colors.outlineMuted}
                  value={venueName}
                  onChangeText={(v) => {
                    setVenueName(v);
                    setVenueSuggestionsVisible(true);
                    setLocationLocked(false);
                  }}
                  onFocus={() => setVenueSuggestionsVisible(true)}
                />
                <TouchableOpacity testID="host-match-open-map-picker" onPress={() => setPinPickerVisible(true)}>
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {/* In-flow (not absolute) — absolute overlays inside ScrollView get painted
                  under Address/Province on Android and look like ghosted layers. */}
              {venueSuggestionsVisible && venueSuggestions.length > 0 && (
                <ScrollView
                  testID="host-match-venue-suggestions"
                  style={styles.suggestionsBox}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {venueSuggestions.map((s, index) => (
                    <TouchableOpacity
                      key={`${s.venueName}-${index}`}
                      testID={`host-match-venue-suggestion-${index}`}
                      style={[styles.suggestionRow, index > 0 && styles.suggestionRowBorder]}
                      onPress={() => applyVenueSuggestion(s)}
                    >
                      <Ionicons name="location-outline" size={14} color={colors.outlineMuted} />
                      <View style={styles.flexShrink}>
                        <Text style={styles.suggestionText} numberOfLines={1}>{s.venueName}</Text>
                        <Text style={styles.suggestionSubtext} numberOfLines={1}>{s.venueAddress}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </Field>

          <Field label={t('matches.host.address')} error={fieldErrors.venueAddress} fieldKey="venueAddress" setFieldRef={setFieldRef} styles={styles}>
            <TextInput
              testID="host-match-venue-address"
              style={styles.input}
              placeholder={t('matches.host.addressPlaceholder')}
              placeholderTextColor={colors.outlineMuted}
              value={venueAddress}
              onChangeText={setVenueAddress}
            />
          </Field>

          <View style={styles.row}>
            <View ref={setFieldRef('province')} collapsable={false} style={styles.rowItem}>
              <SelectField
                label={t('matches.host.provinceCity')}
                placeholder={t('matches.host.selectProvince')}
                value={province}
                onChange={(v) => {
                  setProvince(v);
                  setCity('');
                }}
                options={provinces.map((p) => ({ label: p.name, value: p.code }))}
                error={fieldErrors.province}
                disabled={locationLocked}
              />
            </View>
            <View ref={setFieldRef('city')} collapsable={false} style={styles.rowItem}>
              <SelectField
                label={t('matches.host.wardCommune')}
                placeholder={province ? t('matches.host.selectWard') : t('matches.host.pickProvince')}
                value={city}
                onChange={setCity}
                options={cityOptions}
                error={fieldErrors.city}
                disabled={locationLocked}
              />
            </View>
          </View>
        </Section>

        <Section title={t('matches.host.sectionHostInfo')} icon="person-outline" colors={colors} styles={styles}>
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field label={t('matches.host.hostName')} styles={styles}>
                <TextInput style={[styles.input, styles.readOnlyInput]} value={hostName || '—'} editable={false} />
              </Field>
            </View>
            <View style={styles.rowItem}>
              <Field label={t('matches.host.phoneNumber')} styles={styles}>
                <TextInput style={[styles.input, styles.readOnlyInput]} value={hostPhone || '—'} editable={false} />
              </Field>
            </View>
          </View>
          <Text style={styles.helperText}>{t('matches.host.editProfileHelper')}</Text>
        </Section>

        <Section title={t('matches.host.sectionSchedule')} icon="calendar-outline" colors={colors} styles={styles}>
          <Field label={t('matches.host.date')} error={fieldErrors.date} fieldKey="date" setFieldRef={setFieldRef} styles={styles}>
            {IS_WEB ? (
              <WebDateTimeInput type="date" value={date} min={toIsoDate(new Date())} onChange={setDate} colors={colors} />
            ) : (
              <TouchableOpacity testID="host-match-date" style={styles.pickerField} onPress={() => setShowDatePicker(true)}>
                <Text style={date ? styles.pickerValue : styles.pickerPlaceholder}>{date ? formatDisplayDate(date) : t('matches.host.selectDate')}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={date ? parseIsoDate(date) : new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </Field>
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field label={t('matches.host.startTime')} error={fieldErrors.timeFrom} fieldKey="timeFrom" setFieldRef={setFieldRef} styles={styles}>
                {IS_WEB ? (
                  <WebDateTimeInput type="time" value={timeFrom} onChange={setTimeFrom} colors={colors} />
                ) : (
                  <TouchableOpacity testID="host-match-time-from" style={styles.pickerField} onPress={() => setShowTimeFromPicker(true)}>
                    <Text style={timeFrom ? styles.pickerValue : styles.pickerPlaceholder}>{timeFrom || 'HH:mm'}</Text>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </Field>
            </View>
            <View style={styles.rowItem}>
              <Field label={t('matches.host.endTime')} error={fieldErrors.timeTo} fieldKey="timeTo" setFieldRef={setFieldRef} styles={styles}>
                {IS_WEB ? (
                  <WebDateTimeInput type="time" value={timeTo} onChange={setTimeTo} colors={colors} />
                ) : (
                  <TouchableOpacity testID="host-match-time-to" style={styles.pickerField} onPress={() => setShowTimeToPicker(true)}>
                    <Text style={timeTo ? styles.pickerValue : styles.pickerPlaceholder}>{timeTo || 'HH:mm'}</Text>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </Field>
            </View>
          </View>
          {showTimeFromPicker && (
            <DateTimePicker
              value={timeFrom ? parseHm(timeFrom) : new Date()}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeFromChange}
            />
          )}
          {showTimeToPicker && (
            <DateTimePicker
              value={timeTo ? parseHm(timeTo) : new Date()}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeToChange}
            />
          )}
        </Section>

        <Section title={t('matches.host.sectionCourtConfig')} icon="grid-outline" colors={colors} styles={styles}>
          <View ref={setFieldRef('courts')} collapsable={false} style={styles.courtList}>
            {courts.map((court, index) => {
              const normalized = court.name.trim().toLowerCase();
              const isDuplicate =
                normalized.length > 0 &&
                courts.some((other) => other.key !== court.key && other.name.trim().toLowerCase() === normalized);
              return (
                <View key={court.key} style={styles.courtRow}>
                  <Text style={styles.courtIndex}>{index + 1}</Text>
                  <TextInput
                    testID={`host-match-court-${index}`}
                    style={[styles.input, styles.courtInput, isDuplicate && styles.courtInputDuplicate]}
                    placeholder={index === 0 ? t('matches.host.courtNamePlaceholder') : t('matches.host.courtNumberPlaceholder').replace('{n}', String(index + 1))}
                    placeholderTextColor={colors.outlineMuted}
                    value={court.name}
                    onChangeText={(v) => updateCourtName(court.key, v)}
                  />
                  {courts.length > 1 && (
                    <TouchableOpacity
                      testID={`host-match-remove-court-${index}`}
                      style={styles.removeCourtButton}
                      onPress={() => removeCourt(court.key)}
                    >
                      <Ionicons name="close" size={16} color={colors.roleErrorText} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {courtDuplicateWarning ? (
              <Text testID="host-match-court-duplicate-error" style={styles.fieldError}>
                {courtDuplicateWarning}
              </Text>
            ) : fieldErrors.courts ? (
              <Text style={styles.fieldError}>{fieldErrors.courts}</Text>
            ) : null}
            <TouchableOpacity testID="host-match-add-court" style={styles.addCourtButton} onPress={addCourt}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addCourtText}>{t('matches.host.addCourt')}</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <Section title={t('matches.host.sectionSkillLevel')} icon="stats-chart-outline" colors={colors} styles={styles}>
          <View ref={setFieldRef('skillCodes')} collapsable={false}>
          <TouchableOpacity
            testID="host-match-all-levels"
            style={[styles.allLevelsBanner, allLevels && styles.allLevelsBannerActive]}
            onPress={() => setAllLevels((v) => !v)}
          >
            {allLevels && <Ionicons name="checkmark-circle" size={16} color={colors.successText} />}
            <Text style={[styles.allLevelsLabel, allLevels && styles.allLevelsLabelActive]}>
              {allLevels ? t('matches.host.allLevelsWelcome') : t('matches.host.allLevels')}
            </Text>
          </TouchableOpacity>
          {!allLevels && (
            <>
              <View style={styles.skillGrid}>
                {skillsForSport(sport).map((skill) => {
                  const selected = skillCodes.includes(skill.code);
                  const tier = groupSkillTier(colors, sport, skill.code);
                  return (
                    <TouchableOpacity
                      key={skill.code}
                      testID={`host-match-skill-${skill.code}`}
                      style={[styles.tierChip, { backgroundColor: selected ? tier.text : tier.bg, borderColor: tier.border }]}
                      onPress={() => toggleSkill(skill.code)}
                    >
                      <Text style={[styles.tierChipText, { color: selected ? colors.white : tier.text }]}>{groupSkillLabel(t, skill.code) ?? skill.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {fieldErrors.skillCodes ? <Text style={styles.fieldError}>{fieldErrors.skillCodes}</Text> : null}
            </>
          )}
          </View>
        </Section>

        <Section title={t('matches.host.sectionEntryFee')} icon="cash-outline" colors={colors} styles={styles}>
          {lockCoreFields ? (
            <Text style={styles.helperText}>{t('matches.host.feeLockedHelper')}</Text>
          ) : null}
          <View style={styles.feeToggleRow}>
            <TouchableOpacity
              testID="host-match-fee-gender"
              style={[styles.feeToggleButton, feeType === 'GENDER_RANGE' && styles.feeToggleButtonActive, lockCoreFields && styles.feeToggleButtonDisabled]}
              onPress={() => !lockCoreFields && setFeeType('GENDER_RANGE')}
              disabled={lockCoreFields}
            >
              <Text style={[styles.feeToggleText, feeType === 'GENDER_RANGE' && styles.feeToggleTextActive]}>{t('matches.host.byGender')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="host-match-fee-split"
              style={[styles.feeToggleButton, feeType === 'SPLIT_EVENLY' && styles.feeToggleButtonActive, lockCoreFields && styles.feeToggleButtonDisabled]}
              onPress={() => !lockCoreFields && setFeeType('SPLIT_EVENLY')}
              disabled={lockCoreFields}
            >
              <Text style={[styles.feeToggleText, feeType === 'SPLIT_EVENLY' && styles.feeToggleTextActive]}>{t('matches.host.splitEvenly')}</Text>
            </TouchableOpacity>
          </View>
          {feeType === 'GENDER_RANGE' ? (
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Field label={t('matches.host.maleFee')} error={fieldErrors.priceMax} fieldKey="priceMax" setFieldRef={setFieldRef} styles={styles}>
                  <TextInput
                    testID="host-match-price-male"
                    style={[styles.input, lockCoreFields && styles.readOnlyInput]}
                    placeholder="0"
                    placeholderTextColor={colors.outlineMuted}
                    value={priceMax}
                    onChangeText={setPriceMax}
                    keyboardType="numeric"
                    editable={!lockCoreFields}
                  />
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label={t('matches.host.femaleFee')} error={fieldErrors.priceMin} fieldKey="priceMin" setFieldRef={setFieldRef} styles={styles}>
                  <TextInput
                    testID="host-match-price-female"
                    style={[styles.input, lockCoreFields && styles.readOnlyInput]}
                    placeholder="0"
                    placeholderTextColor={colors.outlineMuted}
                    value={priceMin}
                    onChangeText={setPriceMin}
                    keyboardType="numeric"
                    editable={!lockCoreFields}
                  />
                </Field>
              </View>
            </View>
          ) : (
            <Field label={t('matches.host.totalPrice')} error={fieldErrors.priceMin} fieldKey="priceMin" setFieldRef={setFieldRef} styles={styles}>
              <TextInput
                testID="host-match-price-total"
                style={[styles.input, lockCoreFields && styles.readOnlyInput]}
                placeholder="0"
                placeholderTextColor={colors.outlineMuted}
                value={priceMin}
                onChangeText={setPriceMin}
                keyboardType="numeric"
                editable={!lockCoreFields}
              />
            </Field>
          )}
        </Section>

        {!isEdit ? (
        <Section
          title={t('matches.host.sectionRecurringMatch')}
          icon="repeat-outline"
          colors={colors}
          styles={styles}
          right={
            <Switch
              testID="host-match-recurring"
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ true: colors.primary, false: colors.matchSwitchTrackInactive }}
            />
          }
        >
          {isRecurring && (
            <>
              <Text style={styles.helperText}>{t('matches.host.recurringHelper')}</Text>
              <View ref={setFieldRef('recurringWeekdays')} collapsable={false}>
              <View style={styles.skillGrid}>
                {getWeekdayLabels(t).map((label, day) => {
                  const selected = recurringWeekdays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      testID={`host-match-weekday-${day}`}
                      style={[styles.skillChip, selected && styles.skillChipSelected]}
                      onPress={() => toggleWeekday(day)}
                    >
                      <Text style={[styles.skillChipText, selected && styles.skillChipTextSelected]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {fieldErrors.recurringWeekdays ? <Text style={styles.fieldError}>{fieldErrors.recurringWeekdays}</Text> : null}
              </View>

              <Field label={t('matches.host.numberOfWeeks')} error={fieldErrors.recurringWeeks} fieldKey="recurringWeeks" setFieldRef={setFieldRef} styles={styles}>
                <TextInput
                  testID="host-match-recurring-weeks"
                  style={styles.input}
                  placeholder={t('matches.host.numberOfWeeksPlaceholder')}
                  placeholderTextColor={colors.outlineMuted}
                  value={recurringWeeks}
                  onChangeText={setRecurringWeeks}
                  keyboardType="numeric"
                />
              </Field>
              {recurringPreviewCount > 0 && (
                <Text style={styles.helperText}>{t('matches.host.willPublishCount').replace('{count}', String(recurringPreviewCount))}</Text>
              )}
            </>
          )}
        </Section>
        ) : null}

            <Section title={t('matches.host.sectionFormatSquad')} icon="people-outline" colors={colors} styles={styles}>
              {lockCoreFields ? (
                <Text style={styles.helperText}>{t('matches.host.formatLockedHelper')}</Text>
              ) : null}
              <View ref={setFieldRef('format')} collapsable={false}>
              <View style={styles.skillGrid}>
                {formatsForSport(sport).map((opt) => {
                  const selected = format === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      testID={`host-match-format-${opt.value}`}
                      style={[styles.skillChip, selected && styles.skillChipSelected, lockCoreFields && styles.skillChipDisabled]}
                      disabled={lockCoreFields}
                      onPress={() => {
                        setFormat(opt.value);
                        const min = minPlayersForFormat(opt.value);
                        const current = Number(maxPlayers);
                        if (!maxPlayers.trim() || !Number.isFinite(current) || current < min) {
                          setMaxPlayers(String(min));
                        }
                      }}
                    >
                      <Text style={[styles.skillChipText, selected && styles.skillChipTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {fieldErrors.format ? <Text style={styles.fieldError}>{fieldErrors.format}</Text> : null}
              </View>

              <Field label={t('matches.host.maxPlayers')} error={fieldErrors.maxPlayers} fieldKey="maxPlayers" setFieldRef={setFieldRef} styles={styles}>
                <TextInput
                  testID="host-match-max-players"
                  style={styles.input}
                  placeholder={format ? `e.g. ${minPlayersForFormat(format)}` : t('matches.host.maxPlayersPlaceholder')}
                  placeholderTextColor={colors.outlineMuted}
                  value={maxPlayers}
                  onChangeText={setMaxPlayers}
                  keyboardType="numeric"
                />
              </Field>
              {format ? (
                <Text style={styles.helperText}>
                  {t('matches.host.atLeastPlayersFor')
                    .replace('{min}', String(minPlayersForFormat(format)))
                    .replace('{format}', formatsForSport(sport).find((o) => o.value === format)?.label ?? format)}
                </Text>
              ) : null}
              <Field label={t('matches.host.coverImageUrl')} styles={styles}>
                <TextInput
                  testID="host-match-cover-url"
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={colors.outlineMuted}
                  value={coverUrl}
                  onChangeText={setCoverUrl}
                  autoCapitalize="none"
                />
              </Field>
            </Section>

          <Section title={t('matches.host.sectionJoinApprovalMode')} icon="shield-checkmark-outline" colors={colors} styles={styles}>
            <Text style={styles.helperText}>{t('matches.host.joinApprovalHelper')}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                testID="host-match-join-auto"
                style={[styles.joinModeCard, styles.rowItem, joinMode === 'AUTO' && styles.joinModeCardSelected]}
                onPress={() => setJoinMode('AUTO')}
              >
                <View style={styles.joinModeCardHeader}>
                  <Text style={[styles.joinModeTitle, joinMode === 'AUTO' && styles.joinModeTitleSelected]}>{t('matches.host.autoApproval')}</Text>
                  {joinMode === 'AUTO' && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                </View>
                <Text style={styles.joinModeSubtext}>{t('matches.host.autoApprovalDesc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="host-match-join-approval"
                style={[styles.joinModeCard, styles.rowItem, joinMode === 'APPROVAL' && styles.joinModeCardSelected]}
                onPress={() => setJoinMode('APPROVAL')}
              >
                <View style={styles.joinModeCardHeader}>
                  <Text style={[styles.joinModeTitle, joinMode === 'APPROVAL' && styles.joinModeTitleSelected]}>{t('matches.host.hostReview')}</Text>
                  {joinMode === 'APPROVAL' && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                </View>
                <Text style={styles.joinModeSubtext}>{t('matches.host.hostReviewDesc')}</Text>
              </TouchableOpacity>
            </View>
          </Section>

        <SubmitButton
          label={isEdit ? t('matches.host.saveChanges') : isRecurring ? t('matches.host.publishMatches') : t('matches.host.publishMatch')}
          loading={isSubmitting}
          onPress={handleSubmit}
        />
        </View>
      </ScrollView>

      <PinDropModal
        visible={pinPickerVisible}
        initialLatitude={latitude}
        initialLongitude={longitude}
        seedQuery={venueName.trim() || venueAddress.trim()}
        seedVenueName={venueName}
        provinces={provinces}
        onCancel={() => setPinPickerVisible(false)}
        onConfirm={({ latitude: lat, longitude: lng, address, venueName: pickedName, province: matchedProvince, city: matchedCity }) => {
          setLatitude(lat);
          setLongitude(lng);
          if (pickedName) setVenueName(pickedName);
          if (address) setVenueAddress(address);
          if (matchedProvince) {
            setProvince(matchedProvince);
            setCity(matchedCity ?? ''); // clear stale city — it may belong to the previous province
          }
          setVenueSuggestionsVisible(false); // picked on the map — hide the DB venue-name dropdown
          setLocationLocked(false);
          setPinPickerVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  icon,
  subtitle,
  right,
  children,
  colors,
  styles,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionIconCircle}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  error,
  fieldKey,
  setFieldRef,
  children,
  styles,
}: {
  label: string;
  error?: string;
  fieldKey?: string;
  setFieldRef?: (key: string) => (node: View | null) => void;
  styles: ReturnType<typeof createStyles>;
  children: React.ReactNode;
}) {
  return (
    <View
      style={styles.field}
      collapsable={false}
      ref={fieldKey && setFieldRef ? setFieldRef(fieldKey) : undefined}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackgroundAlt },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screenBackgroundAlt,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.roleCardSelectedBg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary },

  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },

  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.chromeBorder, padding: spacing.md, gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1, gap: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  sectionSubtitle: { fontSize: 12, fontWeight: '600', color: colors.successText },
  sectionBody: { gap: spacing.sm },

  field: { gap: spacing.xxs },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondaryAlt },
  fieldError: { fontSize: 12, color: colors.roleErrorText },
  helperText: { fontSize: 12, color: colors.outlineMuted },

  input: {
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  multilineInput: { height: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
  readOnlyInput: { backgroundColor: colors.roleCardSelectedBg, color: colors.textSecondaryAlt },
  locationInput: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 },

  locationFieldWrap: { gap: spacing.xxs },
  suggestionsBox: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  suggestionRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.chromeBorder },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  suggestionSubtext: { fontSize: 11, color: colors.outlineMuted },
  flexShrink: { flexShrink: 1 },

  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },

  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  pickerValue: { fontSize: 14, color: colors.textPrimary },
  pickerPlaceholder: { fontSize: 14, color: colors.outlineMuted },

  courtList: { gap: spacing.sm },
  courtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  courtIndex: {
    width: 22,
    fontSize: 13,
    fontWeight: '700',
    color: colors.outlineMuted,
    textAlign: 'center',
  },
  courtInput: { flex: 1 },
  courtInputDuplicate: { borderColor: colors.roleErrorText },
  removeCourtButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.dangerSurface, alignItems: 'center', justifyContent: 'center' },
  addCourtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  addCourtText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  allLevelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  allLevelsLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  allLevelsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  allLevelsBannerActive: { backgroundColor: colors.successSurface, borderColor: colors.successBorder },
  allLevelsLabelActive: { color: colors.successText, fontWeight: '700' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: { borderWidth: 1, borderColor: colors.chromeBorder, borderRadius: 9999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  skillChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  skillChipDisabled: { opacity: 0.55 },
  skillChipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  skillChipTextSelected: { color: colors.white },

  // Skill Level chips specifically — same green/orange/red tier scale as
  // FilterSheet.tsx/MatchCard.tsx (skillTierColor), not the neutral
  // blue-selected style used by Format/weekday chips above.
  tierChip: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tierChipText: { fontSize: 13, fontWeight: '700' },

  feeToggleRow: { flexDirection: 'row', gap: spacing.xxs, padding: spacing.xxs, borderRadius: 12, backgroundColor: colors.roleCardSelectedBg },
  feeToggleButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 10 },
  feeToggleButtonDisabled: { opacity: 0.55 },
  feeToggleButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  feeToggleText: { fontSize: 13, fontWeight: '600', color: colors.outlineMuted },
  feeToggleTextActive: { color: colors.primary, fontWeight: '700' },

  joinModeCard: { borderWidth: 1, borderColor: colors.chromeBorder, borderRadius: 12, padding: spacing.sm, gap: spacing.xxs, backgroundColor: colors.surface },
  joinModeCardSelected: { borderColor: colors.primary, backgroundColor: colors.roleCardSelectedBg },
  joinModeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinModeTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  joinModeTitleSelected: { color: colors.primary },
  joinModeSubtext: { fontSize: 11, color: colors.outlineMuted },
});
