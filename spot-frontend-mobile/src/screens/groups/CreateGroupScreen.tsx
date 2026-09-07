import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, findNodeHandle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import SubmitButton from '@/components/common/SubmitButton';
import PinDropModal from '@/components/matches/PinDropModal';
import CreateGroupSchedulePicker, { type RecurringSlotField } from '@/components/groups/CreateGroupSchedulePicker';
import { SelectField } from '@/components/SelectField';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/spacing';
import { skillsForSport } from '@/constants/matchSkills';
import { groupSkillTier } from '@/components/groups/groupPresentation';
import { groupSkillLabel } from '@/components/groups/groupPresentation';
import { getVnAdminTree, getVenueSuggestions } from '@/services/matchService';
import { getMe } from '@/services/authService';
import { createGroup, updateGroup } from '@/services/groupService';
import { getErrorMessage } from '@/services/apiErrors';
import { createGroupSchema } from '@/schemas/createGroupSchema';
import type { CreateGroupPayload, GroupDetail } from '@/types/group';
import type { Sport, VenueSuggestion } from '@/types/match';
import type { VnProvince } from '@/types/geo';

type Props = {
  sport: Sport;
  mode: 'create' | 'edit';
  groupId?: number; // required when mode==='edit'
  initialGroup?: GroupDetail; // pre-fetched by the edit route, so this screen has no loading state of its own
  onBack: () => void;
  onSaved: (groupId: number) => void;
};

type CourtField = { key: string; name: string };

/** Form top→bottom order — scroll to the first invalid field on submit. */
const FIELD_ORDER = [
  'name',
  'title',
  'venueName',
  'venueAddress',
  'province',
  'city',
  'skillCodes',
  'courts',
  'recurringSlots',
  'zaloUrl',
  'logoUrl',
  'coverUrl',
] as const;

const VENUE_FIELD_KEYS = new Set(['venueName', 'venueAddress', 'province', 'city']);

let courtKeySeq = 0;
function nextCourtKey(): string {
  courtKeySeq += 1;
  return `group-court-${courtKeySeq}`;
}

/**
 * Create/Edit Group (Pencil "Matches - Create Group" frame, Groups
 * implementation plan) — mirrors HostMatchScreen.tsx's structure and its
 * local-useState + .safeParse()-on-submit pattern (this form is equally
 * widget-heavy: province/city SelectField, PinDropModal, dynamic courts
 * list, skill chips, plus a recurring-slot builder CreateGroupSchedulePicker
 * that has no Matches equivalent).
 *
 * Location starts as a collapsed "+ Add Venue" summary card (resolved
 * decision #6) instead of always-expanded fields — tapping it reveals the
 * venue name/address/PinDropModal/Province-Ward fields in place.
 *
 * Edit mode always resends the full current courts/recurringSlots/skill/etc.
 * state on save (no partial-field diffing) — matches the backend's own
 * "resend courts if resending recurringSlots" whole-collection-replace rule.
 */
export default function CreateGroupScreen({ sport, mode, groupId, initialGroup, onBack, onSaved }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const fieldLabels: Record<string, string> = {
    name: t('groups.form.groupName'), title: t('groups.form.title'), venueName: t('groups.form.venueName'),
    venueAddress: t('groups.form.address'), province: t('groups.form.province'), city: t('groups.form.ward'),
    skillCodes: t('groups.skill.title'), courts: t('groups.form.courts'), recurringSlots: t('groups.form.recurring'),
    zaloUrl: t('groups.form.zaloLink'), logoUrl: t('groups.form.logoUrl'), coverUrl: t('groups.form.coverUrl'),
  };
  const [name, setName] = useState(initialGroup?.name ?? '');
  const [title, setTitle] = useState(initialGroup?.title ?? '');
  const [description, setDescription] = useState(initialGroup?.description ?? '');

  // Location
  const [venueName, setVenueName] = useState(initialGroup?.venueName ?? '');
  const [venueAddress, setVenueAddress] = useState(initialGroup?.venueAddress ?? '');
  const [province, setProvince] = useState(initialGroup?.province ?? '');
  const [city, setCity] = useState(initialGroup?.city ?? '');
  const [latitude, setLatitude] = useState<number | null>(initialGroup?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialGroup?.longitude ?? null);
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [pinPickerVisible, setPinPickerVisible] = useState(false);
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [venueSuggestionsVisible, setVenueSuggestionsVisible] = useState(false);
  const [venueSuggestionsLoading, setVenueSuggestionsLoading] = useState(false);
  // True after picking a DB venue suggestion / map pin with province+city —
  // greys Province/Ward as read-only until the user edits venue name again.
  const [locationLocked, setLocationLocked] = useState(
    Boolean(initialGroup?.province && initialGroup?.city && initialGroup?.latitude != null)
  );
  // Location section is progressive disclosure (Groups plan resolved
  // decision #6): starts collapsed as an empty "Add Venue" card on create,
  // or a summary card on edit — expands in place when tapped.
  const [venueEditing, setVenueEditing] = useState(false);

  // Skill
  const [allLevels, setAllLevels] = useState(initialGroup?.allLevels ?? false);
  const [skillCodes, setSkillCodes] = useState<string[]>(
    initialGroup ? [initialGroup.skillMin, initialGroup.skillMax].filter((c): c is string => Boolean(c)) : []
  );

  // Join mode
  const [joinMode, setJoinMode] = useState<'AUTO' | 'APPROVAL'>(initialGroup?.joinMode ?? 'AUTO');

  // Courts — editable list in place (same UX as HostMatchScreen).
  const [courts, setCourts] = useState<CourtField[]>(
    initialGroup && initialGroup.courts.length
      ? initialGroup.courts.map((c) => ({ key: nextCourtKey(), name: c.name ?? '' }))
      : [{ key: nextCourtKey(), name: '' }]
  );

  // Recurring schedule
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlotField[]>(
    initialGroup?.recurringSlots?.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startsAt: s.startsAt,
      durationMinutes: s.durationMinutes,
      courtName: s.courtName,
    })) ?? []
  );

  // Contact / media
  const [zaloUrl, setZaloUrl] = useState(initialGroup?.zaloUrl ?? '');
  const [logoUrl, setLogoUrl] = useState(initialGroup?.logoUrl ?? '');
  const [coverUrl, setCoverUrl] = useState(initialGroup?.coverUrl ?? '');
  const logoInputRef = useRef<TextInput>(null);
  const coverInputRef = useRef<TextInput>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Group Admin is always the caller (backend sets it) — display-only, never
  // sent in the payload. Mirrors HostMatchScreen's read-only Host Name field.
  const [adminName, setAdminName] = useState(initialGroup?.admin.fullName ?? '');
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const fieldRefs = useRef<Record<string, View | null>>({});

  const setFieldRef = (key: string) => (node: View | null) => {
    fieldRefs.current[key] = node;
  };

  const scrollToFirstError = (errors: Record<string, string>) => {
    let firstKey =
      FIELD_ORDER.find((key) => errors[key]) ?? Object.keys(errors)[0];
    if (!firstKey) return;
    // Home Venue fields may still be mounting after we expand the section.
    if (VENUE_FIELD_KEYS.has(firstKey) && !fieldRefs.current[firstKey]) {
      firstKey = 'venueName';
    }
    const fieldNode = fieldRefs.current[firstKey];
    const contentNode = contentRef.current;
    if (!fieldNode || !contentNode) return;
    const relativeTo = findNodeHandle(contentNode);
    if (relativeTo == null) return;
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
    getVnAdminTree().then((tree) => setProvinces(tree.provinces)).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (mode === 'edit') return;
    getMe().then((profile) => setAdminName(profile.fullName)).catch(() => undefined);
  }, [mode]);

  useEffect(() => {
    const query = venueName.trim();
    if (query.length < 1 || !venueEditing) {
      setVenueSuggestions([]);
      setVenueSuggestionsLoading(false);
      return;
    }
    setVenueSuggestionsLoading(true);
    const handle = setTimeout(() => {
      // Omit sport so Create Group can reuse any sân already in kèo/groups DB.
      getVenueSuggestions(query)
        .then((rows) => setVenueSuggestions(rows ?? []))
        .catch(() => setVenueSuggestions([]))
        .finally(() => setVenueSuggestionsLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [venueName, venueEditing]);

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

  function addCourt() {
    setCourts((prev) => [...prev, { key: nextCourtKey(), name: '' }]);
  }

  function removeCourt(key: string) {
    setCourts((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  }

  function updateCourtName(key: string, value: string) {
    setCourts((prev) => prev.map((c) => (c.key === key ? { ...c, name: value } : c)));
    if (fieldErrors.courts) {
      setFieldErrors((prev) => {
        if (!prev.courts) return prev;
        const next = { ...prev };
        delete next.courts;
        return next;
      });
    }
  }

  const courtDuplicateWarning = useMemo(() => {
    const names = courts.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
    return new Set(names).size !== names.length ? t('groups.validation.courtUnique') : null;
  }, [courts, t]);

  function addSlot(slot: RecurringSlotField) {
    setRecurringSlots((prev) => [...prev, slot]);
  }

  function removeSlot(index: number) {
    setRecurringSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitError('');
    const skillRanks = skillsForSport(sport);
    const selectedRanks = skillRanks.filter((s) => skillCodes.includes(s.code)).map((s) => s.rank);
    const skillMin = selectedRanks.length ? skillRanks.find((s) => s.rank === Math.min(...selectedRanks))?.code : undefined;
    const skillMax = selectedRanks.length ? skillRanks.find((s) => s.rank === Math.max(...selectedRanks))?.code : undefined;

    const parsed = createGroupSchema.safeParse({
      name,
      title,
      description: description || undefined,
      joinMode,
      venueName,
      venueAddress,
      province,
      city,
      latitude,
      longitude,
      allLevels,
      skillCodes,
      zaloUrl: zaloUrl || undefined,
      logoUrl: logoUrl || undefined,
      coverUrl: coverUrl || undefined,
      courts: courts.map((c) => ({ name: c.name })),
      recurringSlots,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      }
      const needsVenueOpen = Object.keys(errors).some((key) => VENUE_FIELD_KEYS.has(key));
      if (needsVenueOpen) setVenueEditing(true);
      setFieldErrors(errors);
      const orderedKeys = [
        ...FIELD_ORDER.filter((key) => errors[key]),
        ...Object.keys(errors).filter((key) => !FIELD_ORDER.includes(key as (typeof FIELD_ORDER)[number])),
      ];
      const summary = orderedKeys
        .slice(0, 3)
        .map((key) => `${fieldLabels[key] ?? key}: ${errors[key]}`)
        .join('\n');
      setSubmitError(summary || t('groups.validation.fixFields'));
      // Wait a tick if Home Venue must expand before measuring layout.
      setTimeout(() => scrollToFirstError(errors), needsVenueOpen ? 80 : 0);
      return;
    }
    setFieldErrors({});

    const values = parsed.data;
    const payload: CreateGroupPayload = {
      sport,
      name: values.name,
      title: values.title,
      description: values.description ?? null,
      joinMode: values.joinMode,
      venueName: values.venueName,
      venueAddress: values.venueAddress,
      province: values.province,
      city: values.city,
      latitude: values.latitude,
      longitude: values.longitude,
      allLevels: values.allLevels,
      skillMin: values.allLevels ? undefined : skillMin,
      skillMax: values.allLevels ? undefined : skillMax,
      zaloUrl: values.zaloUrl || null,
      logoUrl: values.logoUrl || null,
      coverUrl: values.coverUrl || null,
      courts: values.courts,
      recurringSlots: values.recurringSlots,
    };

    setIsSubmitting(true);
    try {
      if (mode === 'edit' && groupId != null) {
        const group = await updateGroup(groupId, payload);
        onSaved(group.groupId);
      } else {
        const group = await createGroup(payload);
        onSaved(group.groupId);
      }
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const courtNames = courts.map((c) => c.name.trim()).filter(Boolean);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="create-group-back" style={styles.backButton} onPress={onBack} accessibilityLabel={t('groups.actions.back')}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'edit' ? t('groups.form.editTitle') : t('groups.form.createTitle')}</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View ref={contentRef} collapsable={false}>
        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        <Section title={t('groups.form.general')} icon="information-circle-outline">
          <Field label={t('groups.form.groupName')} error={fieldErrors.name} fieldKey="name" setFieldRef={setFieldRef}>
            <TextInput
              testID="create-group-name"
              style={styles.input}
              placeholder={t('groups.form.groupNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </Field>
          <Field label={t('groups.form.groupAdmin')}>
            <View style={styles.adminField}>
              <View style={styles.adminAvatar}>
                <Ionicons name="person" size={14} color={colors.primary} />
              </View>
              <Text style={styles.adminName} numberOfLines={1}>
                {adminName || t('groups.you')}
              </Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>{t('groups.you')}</Text>
              </View>
            </View>
          </Field>
          <Field label={t('groups.form.title')} error={fieldErrors.title} fieldKey="title" setFieldRef={setFieldRef}>
            <TextInput
              testID="create-group-title"
              style={styles.input}
              placeholder={t('groups.form.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </Field>
          <Field label={t('groups.form.description')}>
            <TextInput
              testID="create-group-description"
              style={[styles.input, styles.multilineInput]}
              placeholder={t('groups.form.descriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </Field>
        </Section>

        <Section title={t('groups.form.homeVenue')} icon="location-outline">
          <View ref={setFieldRef('venueName')} collapsable={false}>
          {!venueEditing && venueName ? (
            <TouchableOpacity testID="create-group-add-venue" style={styles.venueSummaryCard} onPress={() => setVenueEditing(true)}>
              <View style={styles.venueSummaryIcon}>
                <Ionicons name="location" size={16} color={colors.primary} />
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.venueSummaryName} numberOfLines={1}>{venueName}</Text>
                <Text style={styles.venueSummaryAddress} numberOfLines={1}>{venueAddress}</Text>
              </View>
              <Ionicons name="pencil" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          ) : !venueEditing ? (
            <View style={styles.emptyVenueCard}>
              <View style={styles.emptyVenueIcon}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <Text style={styles.emptyVenueTitle}>{t('groups.form.noVenue')}</Text>
              <Text style={styles.emptyVenueSubtitle}>{t('groups.form.noVenueHelp')}</Text>
              <TouchableOpacity testID="create-group-add-venue" style={styles.emptyVenueButton} onPress={() => setVenueEditing(true)}>
                <Ionicons name="add" size={16} color={colors.white} />
                <Text style={styles.emptyVenueButtonText}>{t('groups.actions.addVenue')}</Text>
              </TouchableOpacity>
              {fieldErrors.venueName || fieldErrors.venueAddress || fieldErrors.province || fieldErrors.city ? (
                <Text style={styles.fieldError}>{t('groups.form.venueRequired')}</Text>
              ) : null}
            </View>
          ) : (
            <>
              <Field label={t('groups.form.venueName')} error={fieldErrors.venueName}>
                <View style={styles.locationFieldWrap}>
                  <View style={styles.pickerField}>
                    <TextInput
                      testID="create-group-venue-name"
                      style={styles.locationInput}
                      placeholder={t('groups.form.venueNamePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={venueName}
                      onChangeText={(t) => {
                        setVenueName(t);
                        setVenueSuggestionsVisible(true);
                        setLocationLocked(false);
                      }}
                      onFocus={() => setVenueSuggestionsVisible(true)}
                    />
                    <TouchableOpacity testID="create-group-open-map-picker" onPress={() => setPinPickerVisible(true)} accessibilityLabel={t('groups.actions.addVenue')}>
                      <Ionicons name="map-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {venueSuggestionsVisible && venueName.trim().length > 0 && (
                    <View testID="create-group-venue-suggestions" style={styles.suggestionsBox}>
                      {venueSuggestionsLoading ? (
                        <ActivityIndicator style={styles.suggestionsSpinner} color={colors.primary} />
                      ) : venueSuggestions.length > 0 ? (
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {venueSuggestions.map((s, index) => (
                            <TouchableOpacity
                              key={`${s.venueName}-${index}`}
                              testID={`create-group-venue-suggestion-${index}`}
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
                        <Text style={styles.suggestionsEmpty}>{t('groups.form.noVenueMatches')}</Text>
                      )}
                    </View>
                  )}
                </View>
              </Field>
              <Field label={t('groups.form.address')} error={fieldErrors.venueAddress} fieldKey="venueAddress" setFieldRef={setFieldRef}>
                <TextInput
                  testID="create-group-venue-address"
                  style={styles.input}
                  placeholder={t('groups.form.addressPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={venueAddress}
                  onChangeText={setVenueAddress}
                />
              </Field>
              <View style={styles.row}>
                <View ref={setFieldRef('province')} collapsable={false} style={styles.rowItem}>
                  <SelectField
                    themeColors={colors}
                    label={t('groups.form.province')}
                    placeholder={t('groups.form.selectProvince')}
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
                    themeColors={colors}
                    label={t('groups.form.ward')}
                    placeholder={province ? t('groups.form.selectWard') : t('groups.form.pickProvince')}
                    value={city}
                    onChange={setCity}
                    options={cityOptions}
                    error={fieldErrors.city}
                    disabled={locationLocked}
                  />
                </View>
              </View>
              <TouchableOpacity
                testID="create-group-venue-done"
                style={[styles.doneButton, (!venueName || !venueAddress) && styles.doneButtonDisabled]}
                onPress={() => setVenueEditing(false)}
                disabled={!venueName || !venueAddress}
              >
                <Text style={styles.doneButtonText}>{t('groups.actions.done')}</Text>
              </TouchableOpacity>
            </>
          )}
          </View>
        </Section>

        <Section title={t('groups.skill.title')} icon="stats-chart-outline">
          <View ref={setFieldRef('skillCodes')} collapsable={false}>
          <TouchableOpacity
            testID="create-group-all-levels"
            style={[styles.allLevelsBanner, allLevels && styles.allLevelsBannerActive]}
            onPress={() => setAllLevels((v) => !v)}
          >
            {allLevels && <Ionicons name="checkmark-circle" size={16} color={colors.successText} />}
            <Text style={[styles.allLevelsLabel, allLevels && styles.allLevelsLabelActive]}>
              {t('groups.skill.allLevels')}
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
                      testID={`create-group-skill-${skill.code}`}
                      style={[styles.tierChip, { backgroundColor: selected ? tier.text : tier.bg, borderColor: tier.border }]}
                      onPress={() => toggleSkill(skill.code)}
                    >
                      <Text style={[styles.tierChipText, { color: selected ? colors.white : tier.text }]}>{groupSkillLabel(t, skill.code)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {fieldErrors.skillCodes ? <Text style={styles.fieldError}>{fieldErrors.skillCodes}</Text> : null}
            </>
          )}
          </View>
        </Section>

        <Section title={t('groups.form.joinMode')} icon="shield-checkmark-outline">
          <Text style={styles.helperText}>{t('groups.form.joinModeHelp')}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              testID="create-group-join-auto"
              style={[styles.joinModeCard, styles.rowItem, joinMode === 'AUTO' && styles.joinModeCardSelected]}
              onPress={() => setJoinMode('AUTO')}
            >
              <View style={styles.joinModeCardHeader}>
                <Text style={[styles.joinModeTitle, joinMode === 'AUTO' && styles.joinModeTitleSelected]}>{t('groups.form.autoApproval')}</Text>
                {joinMode === 'AUTO' && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
              </View>
              <Text style={styles.joinModeSubtext}>{t('groups.form.autoApprovalHelp')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="create-group-join-approval"
              style={[styles.joinModeCard, styles.rowItem, joinMode === 'APPROVAL' && styles.joinModeCardSelected]}
              onPress={() => setJoinMode('APPROVAL')}
            >
              <View style={styles.joinModeCardHeader}>
                <Text style={[styles.joinModeTitle, joinMode === 'APPROVAL' && styles.joinModeTitleSelected]}>{t('groups.form.adminReview')}</Text>
                {joinMode === 'APPROVAL' && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
              </View>
              <Text style={styles.joinModeSubtext}>{t('groups.form.adminReviewHelp')}</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <Section title={t('groups.form.courts')} icon="grid-outline">
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
                    testID={`create-group-court-${index}`}
                    style={[styles.input, styles.courtInput, isDuplicate && styles.courtInputDuplicate]}
                    placeholder={index === 0 ? t('groups.form.courtPlaceholder') : t('groups.form.courtNamePlaceholder').replace('{n}', String(index + 1))}
                    placeholderTextColor={colors.textMuted}
                    value={court.name}
                    onChangeText={(t) => updateCourtName(court.key, t)}
                  />
                  {courts.length > 1 && (
                    <TouchableOpacity
                      testID={`create-group-remove-court-${index}`}
                      style={styles.removeCourtButton}
                      onPress={() => removeCourt(court.key)}
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {courtDuplicateWarning ? (
              <Text testID="create-group-court-duplicate-error" style={styles.fieldError}>
                {courtDuplicateWarning}
              </Text>
            ) : fieldErrors.courts ? (
              <Text style={styles.fieldError}>{fieldErrors.courts}</Text>
            ) : null}
            <TouchableOpacity testID="create-group-add-court" style={styles.addCourtButton} onPress={addCourt}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addCourtText}>{t('groups.actions.addCourt')}</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <Section title={t('groups.form.recurring')} icon="repeat-outline">
          <View ref={setFieldRef('recurringSlots')} collapsable={false}>
          <Text style={styles.helperText}>{t('groups.form.recurringHelp')}</Text>
          <CreateGroupSchedulePicker
            courtNames={courtNames}
            slots={recurringSlots}
            onAddSlot={addSlot}
            onRemoveSlot={removeSlot}
            error={fieldErrors.recurringSlots}
          />
          </View>
        </Section>

        <Section title={t('groups.form.contactMedia')} icon="link-outline">
          <Field label={t('groups.form.zaloLink')} error={fieldErrors.zaloUrl} fieldKey="zaloUrl" setFieldRef={setFieldRef}>
            <TextInput
              testID="create-group-zalo-url"
              style={styles.input}
              placeholder="https://zalo.me/..."
              placeholderTextColor={colors.textMuted}
              value={zaloUrl}
              onChangeText={setZaloUrl}
              autoCapitalize="none"
            />
          </Field>
          <View style={styles.mediaRow}>
            <View style={styles.mediaLogoCol}>
              <Text style={styles.mediaLabel}>{t('groups.form.logo')}</Text>
              <TouchableOpacity
                style={styles.mediaTileLogo}
                activeOpacity={0.8}
                onPress={() => logoInputRef.current?.focus()}
              >
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.mediaPreviewLogo} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={22} color={colors.primary} />
                    <Text style={styles.mediaTileHint}>1:1</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.mediaCoverCol}>
              <Text style={styles.mediaLabel}>{t('groups.form.coverPhoto')}</Text>
              <TouchableOpacity
                style={styles.mediaTileCover}
                activeOpacity={0.8}
                onPress={() => coverInputRef.current?.focus()}
              >
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.mediaPreviewCover} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                    <Text style={styles.mediaTileCta}>{t('groups.actions.uploadCover')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Field label={t('groups.form.logoUrl')} error={fieldErrors.logoUrl} fieldKey="logoUrl" setFieldRef={setFieldRef}>
            <TextInput
              ref={logoInputRef}
              testID="create-group-logo-url"
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              value={logoUrl}
              onChangeText={setLogoUrl}
              autoCapitalize="none"
            />
          </Field>
          <Field label={t('groups.form.coverUrl')} error={fieldErrors.coverUrl} fieldKey="coverUrl" setFieldRef={setFieldRef}>
            <TextInput
              ref={coverInputRef}
              testID="create-group-cover-url"
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              value={coverUrl}
              onChangeText={setCoverUrl}
              autoCapitalize="none"
            />
          </Field>
        </Section>

        <SubmitButton label={mode === 'edit' ? t('groups.actions.save') : t('groups.actions.createShort')} loading={isSubmitting} onPress={handleSubmit} />
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
            setCity(matchedCity ?? '');
            setLocationLocked(true);
          }
          setVenueSuggestionsVisible(false);
          setPinPickerVisible(false);
        }}
      />
    </SafeAreaView>
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

function Field({
  label,
  error,
  fieldKey,
  setFieldRef,
  children,
}: {
  label: string;
  error?: string;
  fieldKey?: string;
  setFieldRef?: (key: string) => (node: View | null) => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.tintedSurface,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary },

  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },

  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.md, gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  sectionBody: { gap: spacing.sm },

  field: { gap: spacing.xxs },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  fieldError: { fontSize: 12, color: colors.error },
  helperText: { fontSize: 12, color: colors.textMuted },

  input: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  multilineInput: { height: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
  readOnlyInput: { backgroundColor: colors.tintedSurface, color: colors.textSecondary },
  locationInput: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 },
  locationFieldWrap: { gap: spacing.xxs },
  suggestionsBox: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.divider,
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
  suggestionRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  suggestionSubtext: { fontSize: 11, color: colors.textMuted },

  // Group Media tiles — mirror the Pencil "Section - Group Media Card" frame
  // (camera / cloud-upload icon tiles). The pasted-URL TextInputs below stay
  // the source of truth (Groups plan resolved decision #3); tapping a tile
  // just focuses its input, and a set URL renders as a preview thumbnail.
  mediaRow: { flexDirection: 'row', gap: spacing.md },
  mediaLogoCol: { width: 92, gap: spacing.xs },
  mediaCoverCol: { flex: 1, gap: spacing.xs },
  mediaLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, color: colors.textMuted },
  mediaTileLogo: {
    height: 92,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.glassRingBorder,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  mediaTileCover: {
    height: 92,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.glassRingBorder,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  mediaTileHint: { fontSize: 10, fontWeight: '600', color: colors.primary },
  mediaTileCta: { fontSize: 12, fontWeight: '600', color: colors.primary },
  mediaPreviewLogo: { width: '100%', height: '100%' },
  mediaPreviewCover: { width: '100%', height: '100%' },

  flexShrink: { flexShrink: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },

  emptyVenueCard: {
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.glassRingBorder,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  emptyVenueIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  emptyVenueTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  emptyVenueSubtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  emptyVenueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyVenueButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
  venueSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  venueSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueSummaryName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  venueSummaryAddress: { fontSize: 12, color: colors.textSecondary },

  adminField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.roleCardSelectedBg,
  },
  adminAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  adminBadge: { backgroundColor: colors.tintedSurface, borderRadius: 8, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  adminBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },

  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },

  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  doneButtonDisabled: { backgroundColor: colors.primaryDisabledBg },
  doneButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },

  allLevelsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  allLevelsBannerActive: { backgroundColor: colors.successSurface, borderColor: colors.successBorder },
  allLevelsLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  allLevelsLabelActive: { color: colors.successText, fontWeight: '700' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tierChip: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tierChipText: { fontSize: 13, fontWeight: '700' },

  joinModeCard: { borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 12, padding: spacing.sm, gap: spacing.xxs, backgroundColor: colors.surface },
  joinModeCardSelected: { borderColor: colors.primary, backgroundColor: colors.roleCardSelectedBg },
  joinModeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinModeTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  joinModeTitleSelected: { color: colors.primary },
  joinModeSubtext: { fontSize: 11, color: colors.textMuted },

  courtList: { gap: spacing.sm },
  courtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  courtIndex: {
    width: 22,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
  },
  courtInput: { flex: 1 },
  courtInputDuplicate: { borderColor: colors.error },
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
});
