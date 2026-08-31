import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import PinDropModal from '@/components/matches/PinDropModal';
import { SelectField } from '@/components/SelectField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { formatsForSport } from '@/constants/matchFormats';
import { skillTierColor, skillsForSport } from '@/constants/matchSkills';
import { getMe } from '@/services/authService';
import {
  getErrorMessage,
  getVenueSuggestions,
  getVnAdminTree,
  hostMatch,
  hostMatchBulk,
} from '@/services/matchService';
import { hostMatchSchema } from '@/schemas/hostMatchSchema';
import { formatDisplayDate, parseHm, parseIsoDate, toHm, toIsoDate } from '@/utils/dateTime';
import type { CreateMatchBulkPayload, CreateMatchPayload, MatchFormat, Sport, VenueSuggestion } from '@/types/match';
import type { VnProvince } from '@/types/geo';

type Props = {
  sport: Sport;
  onBack: () => void;
  onCreated: () => void;
};

type CourtField = { key: string; name: string };

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BULK_MAX_SCHEDULES = 100;

// @react-native-community/datetimepicker has no web build, so on web fall
// back to the browser's own native date/time inputs. `date` is held as an
// ISO yyyy-mm-dd string and `timeFrom`/`timeTo` as HH:mm — both are exactly
// the value format of <input type="date"> / <input type="time">.
const IS_WEB = Platform.OS === 'web';

function WebDateTimeInput(props: { type: 'date' | 'time'; value: string; min?: string; onChange: (v: string) => void }) {
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
export default function HostMatchScreen({ sport, onBack, onCreated }: Props) {
  // Host identity (read-only)
  const [hostName, setHostName] = useState('');
  const [hostPhone, setHostPhone] = useState('');

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
  const [locationFieldHeight, setLocationFieldHeight] = useState(0);
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

  // Courts
  const [courts, setCourts] = useState<CourtField[]>([{ key: nextCourtKey(), name: '' }]);
  const [newCourtName, setNewCourtName] = useState('');

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

  useEffect(() => {
    getMe().then((profile) => {
      setHostName(profile.fullName);
      setHostPhone(profile.phoneNumber ?? '');
    }).catch(() => {});
    getVnAdminTree().then((tree) => setProvinces(tree.provinces)).catch(() => setProvinces([]));
  }, []);

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
    setCourts((prev) => [...prev, { key: nextCourtKey(), name: newCourtName.trim() }]);
    setNewCourtName('');
  }

  function removeCourt(key: string) {
    setCourts((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  }

  function updateCourtName(key: string, name: string) {
    setCourts((prev) => prev.map((c) => (c.key === key ? { ...c, name } : c)));
  }

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
      isRecurring,
      recurringWeekdays,
      recurringWeeks: recurringWeeks === '' ? undefined : recurringWeeks,
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

    const values = parsed.data;
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
      isRecurring: values.isRecurring,
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
      if (values.isRecurring) {
        const schedules = buildSchedules();
        const payload: CreateMatchBulkPayload = { template, schedules };
        const result = await hostMatchBulk(payload);
        if (result.failed.length > 0) {
          Alert.alert(
            'Some matches were not created',
            `${result.totalCreated}/${result.totalRequested} created. ${result.failed.length} slot(s) conflicted with an existing booking.`
          );
        } else {
          Alert.alert('Matches created', `${result.totalCreated} matches published.`);
        }
        if (result.totalCreated > 0) onCreated();
      } else {
        const [fromH, fromM] = values.timeFrom.split(':').map(Number);
        const [toH, toM] = values.timeTo.split(':').map(Number);
        const startsAtDate = parseIsoDate(values.date);
        startsAtDate.setHours(fromH, fromM, 0, 0);
        const endsAtDate = parseIsoDate(values.date);
        endsAtDate.setHours(toH, toM, 0, 0);
        await hostMatch({ ...template, startsAt: startsAtDate.toISOString(), endsAt: endsAtDate.toISOString() });
        onCreated();
      }
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="host-match-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Host a Match</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        <Section title="General Information" icon="information-circle-outline">
          <Field label="Match Title" error={fieldErrors.title}>
            <TextInput
              testID="host-match-title"
              style={styles.input}
              placeholder="e.g., Monday Night Badminton"
              placeholderTextColor={colors.outline}
              value={title}
              onChangeText={setTitle}
            />
          </Field>
          <Field label="Description">
            <TextInput
              testID="host-match-notes"
              style={[styles.input, styles.multilineInput]}
              placeholder="Tell players more about the vibe, rotation, or expectations..."
              placeholderTextColor={colors.outline}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </Field>

          <Field label="Venue name" error={fieldErrors.venueName}>
            <View style={styles.locationFieldWrap}>
              <View style={styles.pickerField} onLayout={(e) => setLocationFieldHeight(e.nativeEvent.layout.height)}>
                <TextInput
                  testID="host-match-venue-name"
                  style={styles.locationInput}
                  placeholder="Search or enter venue name"
                  placeholderTextColor={colors.outline}
                  value={venueName}
                  onChangeText={(t) => {
                    setVenueName(t);
                    setVenueSuggestionsVisible(true);
                    setLocationLocked(false);
                  }}
                  onFocus={() => setVenueSuggestionsVisible(true)}
                />
                <TouchableOpacity testID="host-match-open-map-picker" onPress={() => setPinPickerVisible(true)}>
                  <Ionicons name="map-outline" size={18} color={colors.primaryDark} />
                </TouchableOpacity>
              </View>
              {venueSuggestionsVisible && venueSuggestions.length > 0 && (
                <View style={[styles.suggestionsBox, { top: locationFieldHeight + spacing.xxs }]}>
                  {venueSuggestions.map((s, index) => (
                    <TouchableOpacity
                      key={`${s.venueName}-${index}`}
                      testID={`host-match-venue-suggestion-${index}`}
                      style={styles.suggestionRow}
                      onPress={() => applyVenueSuggestion(s)}
                    >
                      <Ionicons name="location-outline" size={14} color={colors.outline} />
                      <View style={styles.flexShrink}>
                        <Text style={styles.suggestionText} numberOfLines={1}>{s.venueName}</Text>
                        <Text style={styles.suggestionSubtext} numberOfLines={1}>{s.venueAddress}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </Field>

          <Field label="Address" error={fieldErrors.venueAddress}>
            <TextInput
              testID="host-match-venue-address"
              style={styles.input}
              placeholder="Street address"
              placeholderTextColor={colors.outline}
              value={venueAddress}
              onChangeText={setVenueAddress}
            />
          </Field>

          <View style={styles.row}>
            <SelectField
              label="Province/City"
              placeholder="Select province"
              value={province}
              onChange={(v) => {
                setProvince(v);
                setCity('');
              }}
              options={provinces.map((p) => ({ label: p.name, value: p.code }))}
              error={fieldErrors.province}
              containerStyle={styles.rowItem}
              disabled={locationLocked}
            />
            <SelectField
              label="Ward/Commune"
              placeholder={province ? 'Select ward' : 'Pick province'}
              value={city}
              onChange={setCity}
              options={cityOptions}
              error={fieldErrors.city}
              containerStyle={styles.rowItem}
              disabled={locationLocked}
            />
          </View>
        </Section>

        <Section title="Host Info" icon="person-outline">
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field label="Host Name">
                <TextInput style={[styles.input, styles.readOnlyInput]} value={hostName || '—'} editable={false} />
              </Field>
            </View>
            <View style={styles.rowItem}>
              <Field label="Phone Number">
                <TextInput style={[styles.input, styles.readOnlyInput]} value={hostPhone || '—'} editable={false} />
              </Field>
            </View>
          </View>
          <Text style={styles.helperText}>Edit your name/phone from Profile — not sent per-match.</Text>
        </Section>

        <Section title="Schedule" icon="calendar-outline">
          <Field label="Date" error={fieldErrors.date}>
            {IS_WEB ? (
              <WebDateTimeInput type="date" value={date} min={toIsoDate(new Date())} onChange={setDate} />
            ) : (
              <TouchableOpacity testID="host-match-date" style={styles.pickerField} onPress={() => setShowDatePicker(true)}>
                <Text style={date ? styles.pickerValue : styles.pickerPlaceholder}>{date ? formatDisplayDate(date) : 'Select a date'}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
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
              <Field label="Start Time" error={fieldErrors.timeFrom}>
                {IS_WEB ? (
                  <WebDateTimeInput type="time" value={timeFrom} onChange={setTimeFrom} />
                ) : (
                  <TouchableOpacity testID="host-match-time-from" style={styles.pickerField} onPress={() => setShowTimeFromPicker(true)}>
                    <Text style={timeFrom ? styles.pickerValue : styles.pickerPlaceholder}>{timeFrom || 'HH:mm'}</Text>
                    <Ionicons name="time-outline" size={18} color={colors.primaryDark} />
                  </TouchableOpacity>
                )}
              </Field>
            </View>
            <View style={styles.rowItem}>
              <Field label="End Time" error={fieldErrors.timeTo}>
                {IS_WEB ? (
                  <WebDateTimeInput type="time" value={timeTo} onChange={setTimeTo} />
                ) : (
                  <TouchableOpacity testID="host-match-time-to" style={styles.pickerField} onPress={() => setShowTimeToPicker(true)}>
                    <Text style={timeTo ? styles.pickerValue : styles.pickerPlaceholder}>{timeTo || 'HH:mm'}</Text>
                    <Ionicons name="time-outline" size={18} color={colors.primaryDark} />
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

        <Section title="Court Configuration" icon="grid-outline">
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field label="No. of Courts">
                <TextInput style={[styles.input, styles.readOnlyInput]} value={String(courts.length)} editable={false} />
              </Field>
            </View>
            <View style={styles.rowItem}>
              <Field label="Court Name">
                <TextInput
                  testID="host-match-new-court-name"
                  style={styles.input}
                  placeholder="e.g., Court 3 & 4"
                  placeholderTextColor={colors.outline}
                  value={newCourtName}
                  onChangeText={setNewCourtName}
                  onSubmitEditing={addCourt}
                />
              </Field>
            </View>
          </View>
          {fieldErrors.courts ? <Text style={styles.fieldError}>{fieldErrors.courts}</Text> : null}
          <TouchableOpacity testID="host-match-add-court" style={styles.addCourtButton} onPress={addCourt}>
            <Ionicons name="add" size={16} color={colors.primaryDark} />
            <Text style={styles.addCourtText}>Add Court</Text>
          </TouchableOpacity>

          {courts.map((court, index) => (
            <View key={court.key} style={styles.courtRow}>
              <TextInput
                testID={`host-match-court-${index}`}
                style={[styles.input, styles.courtInput]}
                placeholder={`Court ${index + 1} name`}
                placeholderTextColor={colors.outline}
                value={court.name}
                onChangeText={(t) => updateCourtName(court.key, t)}
              />
              {courts.length > 1 && (
                <TouchableOpacity testID={`host-match-remove-court-${index}`} style={styles.removeCourtButton} onPress={() => removeCourt(court.key)}>
                  <Ionicons name="close" size={16} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </Section>

        <Section title="Skill Level" icon="stats-chart-outline">
          <TouchableOpacity
            testID="host-match-all-levels"
            style={[styles.allLevelsBanner, allLevels && styles.allLevelsBannerActive]}
            onPress={() => setAllLevels((v) => !v)}
          >
            {allLevels && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
            <Text style={[styles.allLevelsLabel, allLevels && styles.allLevelsLabelActive]}>
              {allLevels ? 'All Levels Welcome' : 'All Levels'}
            </Text>
          </TouchableOpacity>
          {!allLevels && (
            <>
              <View style={styles.skillGrid}>
                {skillsForSport(sport).map((skill) => {
                  const selected = skillCodes.includes(skill.code);
                  const tier = skillTierColor(sport, skill.code);
                  return (
                    <TouchableOpacity
                      key={skill.code}
                      testID={`host-match-skill-${skill.code}`}
                      style={[styles.tierChip, { backgroundColor: selected ? tier.text : tier.bg, borderColor: tier.border }]}
                      onPress={() => toggleSkill(skill.code)}
                    >
                      <Text style={[styles.tierChipText, { color: selected ? colors.white : tier.text }]}>{skill.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {fieldErrors.skillCodes ? <Text style={styles.fieldError}>{fieldErrors.skillCodes}</Text> : null}
            </>
          )}
        </Section>

        <Section title="Entry Fee" icon="cash-outline" subtitle="Fee enabled">
          <View style={styles.feeToggleRow}>
            <TouchableOpacity
              testID="host-match-fee-gender"
              style={[styles.feeToggleButton, feeType === 'GENDER_RANGE' && styles.feeToggleButtonActive]}
              onPress={() => setFeeType('GENDER_RANGE')}
            >
              <Text style={[styles.feeToggleText, feeType === 'GENDER_RANGE' && styles.feeToggleTextActive]}>By Gender</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="host-match-fee-split"
              style={[styles.feeToggleButton, feeType === 'SPLIT_EVENLY' && styles.feeToggleButtonActive]}
              onPress={() => setFeeType('SPLIT_EVENLY')}
            >
              <Text style={[styles.feeToggleText, feeType === 'SPLIT_EVENLY' && styles.feeToggleTextActive]}>Split Evenly</Text>
            </TouchableOpacity>
          </View>
          {feeType === 'GENDER_RANGE' ? (
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Field label="Male Fee (VND)" error={fieldErrors.priceMax}>
                  <TextInput
                    testID="host-match-price-male"
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.outline}
                    value={priceMax}
                    onChangeText={setPriceMax}
                    keyboardType="numeric"
                  />
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="Female Fee (VND)" error={fieldErrors.priceMin}>
                  <TextInput
                    testID="host-match-price-female"
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.outline}
                    value={priceMin}
                    onChangeText={setPriceMin}
                    keyboardType="numeric"
                  />
                </Field>
              </View>
            </View>
          ) : (
            <Field label="Total Price (VND)" error={fieldErrors.priceMin}>
              <TextInput
                testID="host-match-price-total"
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.outline}
                value={priceMin}
                onChangeText={setPriceMin}
                keyboardType="numeric"
              />
            </Field>
          )}
        </Section>

        <Section
          title="Recurring Match"
          icon="repeat-outline"
          right={
            <Switch
              testID="host-match-recurring"
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ true: colors.primaryDark, false: colors.dotInactive }}
            />
          }
        >
          {isRecurring && (
            <>
              <Text style={styles.helperText}>Repeats on these weekdays, starting from the Date above.</Text>
              <View style={styles.skillGrid}>
                {WEEKDAY_LABELS.map((label, day) => {
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

              <Field label="Number of Weeks" error={fieldErrors.recurringWeeks}>
                <TextInput
                  testID="host-match-recurring-weeks"
                  style={styles.input}
                  placeholder="e.g. 8"
                  placeholderTextColor={colors.outline}
                  value={recurringWeeks}
                  onChangeText={setRecurringWeeks}
                  keyboardType="numeric"
                />
              </Field>
              {recurringPreviewCount > 0 && (
                <Text style={styles.helperText}>This will publish {recurringPreviewCount} matches.</Text>
              )}
            </>
          )}
        </Section>

            <Section title="Format & Squad" icon="people-outline">
              <View style={styles.skillGrid}>
                {formatsForSport(sport).map((opt) => {
                  const selected = format === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      testID={`host-match-format-${opt.value}`}
                      style={[styles.skillChip, selected && styles.skillChipSelected]}
                      onPress={() => setFormat(opt.value)}
                    >
                      <Text style={[styles.skillChipText, selected && styles.skillChipTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {fieldErrors.format ? <Text style={styles.fieldError}>{fieldErrors.format}</Text> : null}

              <Field label="Max Players" error={fieldErrors.maxPlayers}>
                <TextInput
                  testID="host-match-max-players"
                  style={styles.input}
                  placeholder="e.g. 14"
                  placeholderTextColor={colors.outline}
                  value={maxPlayers}
                  onChangeText={setMaxPlayers}
                  keyboardType="numeric"
                />
              </Field>
              <Field label="Cover Image URL (Optional)">
                <TextInput
                  testID="host-match-cover-url"
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor={colors.outline}
                  value={coverUrl}
                  onChangeText={setCoverUrl}
                  autoCapitalize="none"
                />
              </Field>
            </Section>

          <Section title="Join Approval Mode" icon="shield-checkmark-outline">
            <Text style={styles.helperText}>Choose how players join your match squad.</Text>
            <View style={styles.row}>
              <TouchableOpacity
                testID="host-match-join-auto"
                style={[styles.joinModeCard, styles.rowItem, joinMode === 'AUTO' && styles.joinModeCardSelected]}
                onPress={() => setJoinMode('AUTO')}
              >
                <View style={styles.joinModeCardHeader}>
                  <Text style={[styles.joinModeTitle, joinMode === 'AUTO' && styles.joinModeTitleSelected]}>Auto-Approval</Text>
                  {joinMode === 'AUTO' && <Ionicons name="checkmark-circle" size={16} color={colors.primaryDark} />}
                </View>
                <Text style={styles.joinModeSubtext}>Players join instantly without host review.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="host-match-join-approval"
                style={[styles.joinModeCard, styles.rowItem, joinMode === 'APPROVAL' && styles.joinModeCardSelected]}
                onPress={() => setJoinMode('APPROVAL')}
              >
                <View style={styles.joinModeCardHeader}>
                  <Text style={[styles.joinModeTitle, joinMode === 'APPROVAL' && styles.joinModeTitleSelected]}>Host Review</Text>
                  {joinMode === 'APPROVAL' && <Ionicons name="checkmark-circle" size={16} color={colors.primaryDark} />}
                </View>
                <Text style={styles.joinModeSubtext}>Requests require host approval before joining.</Text>
              </TouchableOpacity>
            </View>
          </Section>

        <SubmitButton label={isRecurring ? 'Publish Matches' : 'Publish Match'} loading={isSubmitting} onPress={handleSubmit} />
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
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionIconCircle}>
          <Ionicons name={icon} size={16} color={colors.primaryDark} />
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.headingText },

  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },

  section: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1, gap: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.headingText },
  sectionSubtitle: { fontSize: 12, fontWeight: '600', color: colors.success },
  sectionBody: { gap: spacing.sm },

  field: { gap: spacing.xxs },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.bodyText },
  fieldError: { fontSize: 12, color: colors.error },
  helperText: { fontSize: 12, color: colors.outline },

  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.headingText,
    backgroundColor: colors.white,
  },
  multilineInput: { height: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
  readOnlyInput: { backgroundColor: colors.iconBackground, color: colors.bodyText },
  locationInput: { flex: 1, fontSize: 14, color: colors.headingText, paddingVertical: 0 },

  // Absolute overlay (not in normal flow) so opening the dropdown doesn't
  // shove Address/Province/Ward down the screen — `top` is set inline from
  // the measured pickerField height (locationFieldHeight).
  locationFieldWrap: { position: 'relative', zIndex: 20, elevation: 20 },
  suggestionsBox: {
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
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.headingText },
  suggestionSubtext: { fontSize: 11, color: colors.outline },
  flexShrink: { flexShrink: 1 },

  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },

  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  pickerValue: { fontSize: 14, color: colors.headingText },
  pickerPlaceholder: { fontSize: 14, color: colors.outline },

  courtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  courtInput: { flex: 1 },
  removeCourtButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.errorBackground, alignItems: 'center', justifyContent: 'center' },
  addCourtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  addCourtText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  allLevelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  allLevelsLabel: { fontSize: 14, fontWeight: '600', color: colors.headingText },

  allLevelsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  allLevelsBannerActive: { backgroundColor: colors.skillTierGreenBg, borderColor: colors.skillTierGreenBorder },
  allLevelsLabelActive: { color: colors.skillTierGreenText, fontWeight: '700' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 9999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.white },
  skillChipSelected: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  skillChipText: { fontSize: 13, fontWeight: '600', color: colors.headingText },
  skillChipTextSelected: { color: colors.white },

  // Skill Level chips specifically — same green/orange/red tier scale as
  // FilterSheet.tsx/MatchCard.tsx (skillTierColor), not the neutral
  // blue-selected style used by Format/weekday chips above.
  tierChip: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tierChipText: { fontSize: 13, fontWeight: '700' },

  feeToggleRow: { flexDirection: 'row', gap: spacing.xxs, padding: spacing.xxs, borderRadius: 12, backgroundColor: colors.iconBackground },
  feeToggleButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 10 },
  feeToggleButtonActive: {
    backgroundColor: colors.white,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  feeToggleText: { fontSize: 13, fontWeight: '600', color: colors.outline },
  feeToggleTextActive: { color: colors.primaryDark, fontWeight: '700' },

  joinModeCard: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: spacing.sm, gap: spacing.xxs, backgroundColor: colors.white },
  joinModeCardSelected: { borderColor: colors.primaryDark, backgroundColor: colors.selectedBackground },
  joinModeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinModeTitle: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  joinModeTitleSelected: { color: colors.primaryDark },
  joinModeSubtext: { fontSize: 11, color: colors.outline },
});
