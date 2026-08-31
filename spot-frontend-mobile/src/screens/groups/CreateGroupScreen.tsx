import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import SubmitButton from '@/components/common/SubmitButton';
import PinDropModal from '@/components/matches/PinDropModal';
import CreateGroupSchedulePicker, { type RecurringSlotField } from '@/components/groups/CreateGroupSchedulePicker';
import { SelectField } from '@/components/SelectField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillTierColor, skillsForSport } from '@/constants/matchSkills';
import { getVnAdminTree } from '@/services/matchService';
import { getMe } from '@/services/authService';
import { createGroup, updateGroup } from '@/services/groupService';
import { getErrorMessage } from '@/services/apiErrors';
import { createGroupSchema } from '@/schemas/createGroupSchema';
import type { CreateGroupPayload, GroupDetail } from '@/types/group';
import type { Sport } from '@/types/match';
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

  // Courts
  const [courts, setCourts] = useState<CourtField[]>(
    initialGroup && initialGroup.courts.length
      ? initialGroup.courts.map((c) => ({ key: nextCourtKey(), name: c.name ?? '' }))
      : [{ key: nextCourtKey(), name: '' }]
  );
  const [newCourtName, setNewCourtName] = useState('');

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

  useEffect(() => {
    getVnAdminTree().then((tree) => setProvinces(tree.provinces)).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (mode === 'edit') return;
    getMe().then((profile) => setAdminName(profile.fullName)).catch(() => undefined);
  }, [mode]);

  const selectedProvince = provinces.find((p) => p.code === province);
  const cityOptions = (selectedProvince?.cities ?? []).map((c) => ({ label: c.name, value: c.code }));

  function toggleSkill(code: string) {
    setSkillCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function addCourt() {
    if (!newCourtName.trim()) return;
    setCourts((prev) => [...prev, { key: nextCourtKey(), name: newCourtName.trim() }]);
    setNewCourtName('');
  }

  function removeCourt(key: string) {
    setCourts((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  }

  function updateCourtName(key: string, value: string) {
    setCourts((prev) => prev.map((c) => (c.key === key ? { ...c, name: value } : c)));
  }

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
      setFieldErrors(errors);
      setSubmitError('Please fix the highlighted fields.');
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
        <TouchableOpacity testID="create-group-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mode === 'edit' ? 'Edit Group' : 'Create Group'}</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        <Section title="General Information" icon="information-circle-outline">
          <Field label="Group Name" error={fieldErrors.name}>
            <TextInput
              testID="create-group-name"
              style={styles.input}
              placeholder="e.g., Saturday Badminton Club"
              placeholderTextColor={colors.outline}
              value={name}
              onChangeText={setName}
            />
          </Field>
          <Field label="Group Admin">
            <View style={styles.adminField}>
              <View style={styles.adminAvatar}>
                <Ionicons name="person" size={14} color={colors.primaryDark} />
              </View>
              <Text style={styles.adminName} numberOfLines={1}>
                {adminName || 'You'}
              </Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>YOU</Text>
              </View>
            </View>
          </Field>
          <Field label="Title" error={fieldErrors.title}>
            <TextInput
              testID="create-group-title"
              style={styles.input}
              placeholder="Shown on group cards"
              placeholderTextColor={colors.outline}
              value={title}
              onChangeText={setTitle}
            />
          </Field>
          <Field label="Description">
            <TextInput
              testID="create-group-description"
              style={[styles.input, styles.multilineInput]}
              placeholder="Tell players what this group is about..."
              placeholderTextColor={colors.outline}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </Field>
        </Section>

        <Section title="Home Venue" icon="location-outline">
          {!venueEditing && venueName ? (
            <TouchableOpacity testID="create-group-add-venue" style={styles.venueSummaryCard} onPress={() => setVenueEditing(true)}>
              <View style={styles.venueSummaryIcon}>
                <Ionicons name="location" size={16} color={colors.primaryDark} />
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.venueSummaryName} numberOfLines={1}>{venueName}</Text>
                <Text style={styles.venueSummaryAddress} numberOfLines={1}>{venueAddress}</Text>
              </View>
              <Ionicons name="pencil" size={15} color={colors.outline} />
            </TouchableOpacity>
          ) : !venueEditing ? (
            <View style={styles.emptyVenueCard}>
              <View style={styles.emptyVenueIcon}>
                <Ionicons name="location" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.emptyVenueTitle}>No active venue yet</Text>
              <Text style={styles.emptyVenueSubtitle}>Add a primary location where your group usually meets.</Text>
              <TouchableOpacity testID="create-group-add-venue" style={styles.emptyVenueButton} onPress={() => setVenueEditing(true)}>
                <Ionicons name="add" size={16} color={colors.white} />
                <Text style={styles.emptyVenueButtonText}>Add Venue</Text>
              </TouchableOpacity>
              {fieldErrors.venueName || fieldErrors.venueAddress || fieldErrors.province || fieldErrors.city ? (
                <Text style={styles.fieldError}>Add a venue with province and ward to continue.</Text>
              ) : null}
            </View>
          ) : (
            <>
              <Field label="Venue Name" error={fieldErrors.venueName}>
                <View style={styles.pickerField}>
                  <TextInput
                    testID="create-group-venue-name"
                    style={styles.locationInput}
                    placeholder="Venue name"
                    placeholderTextColor={colors.outline}
                    value={venueName}
                    onChangeText={setVenueName}
                  />
                  <TouchableOpacity testID="create-group-open-map-picker" onPress={() => setPinPickerVisible(true)}>
                    <Ionicons name="map-outline" size={18} color={colors.primaryDark} />
                  </TouchableOpacity>
                </View>
              </Field>
              <Field label="Address" error={fieldErrors.venueAddress}>
                <TextInput
                  testID="create-group-venue-address"
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
                />
                <SelectField
                  label="Ward/Commune"
                  placeholder={province ? 'Select ward' : 'Pick province'}
                  value={city}
                  onChange={setCity}
                  options={cityOptions}
                  error={fieldErrors.city}
                  containerStyle={styles.rowItem}
                />
              </View>
              <TouchableOpacity
                testID="create-group-venue-done"
                style={[styles.doneButton, (!venueName || !venueAddress) && styles.doneButtonDisabled]}
                onPress={() => setVenueEditing(false)}
                disabled={!venueName || !venueAddress}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
        </Section>

        <Section title="Skill Level" icon="stats-chart-outline">
          <TouchableOpacity
            testID="create-group-all-levels"
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
                      testID={`create-group-skill-${skill.code}`}
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

        <Section title="Join Mode" icon="shield-checkmark-outline">
          <Text style={styles.helperText}>Choose how players join this group.</Text>
          <View style={styles.row}>
            <TouchableOpacity
              testID="create-group-join-auto"
              style={[styles.joinModeCard, styles.rowItem, joinMode === 'AUTO' && styles.joinModeCardSelected]}
              onPress={() => setJoinMode('AUTO')}
            >
              <View style={styles.joinModeCardHeader}>
                <Text style={[styles.joinModeTitle, joinMode === 'AUTO' && styles.joinModeTitleSelected]}>Auto-Approval</Text>
                {joinMode === 'AUTO' && <Ionicons name="checkmark-circle" size={16} color={colors.primaryDark} />}
              </View>
              <Text style={styles.joinModeSubtext}>Players join instantly.</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="create-group-join-approval"
              style={[styles.joinModeCard, styles.rowItem, joinMode === 'APPROVAL' && styles.joinModeCardSelected]}
              onPress={() => setJoinMode('APPROVAL')}
            >
              <View style={styles.joinModeCardHeader}>
                <Text style={[styles.joinModeTitle, joinMode === 'APPROVAL' && styles.joinModeTitleSelected]}>Admin Review</Text>
                {joinMode === 'APPROVAL' && <Ionicons name="checkmark-circle" size={16} color={colors.primaryDark} />}
              </View>
              <Text style={styles.joinModeSubtext}>Requests need admin approval.</Text>
            </TouchableOpacity>
          </View>
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
                  testID="create-group-new-court-name"
                  style={styles.input}
                  placeholder="e.g., Court A"
                  placeholderTextColor={colors.outline}
                  value={newCourtName}
                  onChangeText={setNewCourtName}
                  onSubmitEditing={addCourt}
                />
              </Field>
            </View>
          </View>
          {fieldErrors.courts ? <Text style={styles.fieldError}>{fieldErrors.courts}</Text> : null}
          <TouchableOpacity testID="create-group-add-court" style={styles.addCourtButton} onPress={addCourt}>
            <Ionicons name="add" size={16} color={colors.primaryDark} />
            <Text style={styles.addCourtText}>Add Court</Text>
          </TouchableOpacity>

          {courts.map((court, index) => (
            <View key={court.key} style={styles.courtRow}>
              <TextInput
                testID={`create-group-court-${index}`}
                style={[styles.input, styles.courtInput]}
                placeholder={`Court ${index + 1} name`}
                placeholderTextColor={colors.outline}
                value={court.name}
                onChangeText={(t) => updateCourtName(court.key, t)}
              />
              {courts.length > 1 && (
                <TouchableOpacity testID={`create-group-remove-court-${index}`} style={styles.removeCourtButton} onPress={() => removeCourt(court.key)}>
                  <Ionicons name="close" size={16} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </Section>

        <Section title="Recurring Schedule" icon="repeat-outline">
          <Text style={styles.helperText}>Add the weekly time slots this group plays at.</Text>
          <CreateGroupSchedulePicker
            courtNames={courtNames}
            slots={recurringSlots}
            onAddSlot={addSlot}
            onRemoveSlot={removeSlot}
            error={fieldErrors.recurringSlots}
          />
        </Section>

        <Section title="Contact & Media" icon="link-outline">
          <Field label="Zalo Link (Optional)" error={fieldErrors.zaloUrl}>
            <TextInput
              testID="create-group-zalo-url"
              style={styles.input}
              placeholder="https://zalo.me/..."
              placeholderTextColor={colors.outline}
              value={zaloUrl}
              onChangeText={setZaloUrl}
              autoCapitalize="none"
            />
          </Field>
          <View style={styles.mediaRow}>
            <View style={styles.mediaLogoCol}>
              <Text style={styles.mediaLabel}>LOGO</Text>
              <TouchableOpacity
                style={styles.mediaTileLogo}
                activeOpacity={0.8}
                onPress={() => logoInputRef.current?.focus()}
              >
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.mediaPreviewLogo} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={22} color={colors.primaryDark} />
                    <Text style={styles.mediaTileHint}>1:1</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.mediaCoverCol}>
              <Text style={styles.mediaLabel}>COVER PHOTO</Text>
              <TouchableOpacity
                style={styles.mediaTileCover}
                activeOpacity={0.8}
                onPress={() => coverInputRef.current?.focus()}
              >
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.mediaPreviewCover} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={24} color={colors.primaryDark} />
                    <Text style={styles.mediaTileCta}>Upload Cover</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Field label="Logo URL (Optional)" error={fieldErrors.logoUrl}>
            <TextInput
              ref={logoInputRef}
              testID="create-group-logo-url"
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={colors.outline}
              value={logoUrl}
              onChangeText={setLogoUrl}
              autoCapitalize="none"
            />
          </Field>
          <Field label="Cover Image URL (Optional)" error={fieldErrors.coverUrl}>
            <TextInput
              ref={coverInputRef}
              testID="create-group-cover-url"
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={colors.outline}
              value={coverUrl}
              onChangeText={setCoverUrl}
              autoCapitalize="none"
            />
          </Field>
        </Section>

        <SubmitButton label={mode === 'edit' ? 'Save Changes' : 'Create Group'} loading={isSubmitting} onPress={handleSubmit} />
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
          }
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
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.headingText },
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

  // Group Media tiles — mirror the Pencil "Section - Group Media Card" frame
  // (camera / cloud-upload icon tiles). The pasted-URL TextInputs below stay
  // the source of truth (Groups plan resolved decision #3); tapping a tile
  // just focuses its input, and a set URL renders as a preview thumbnail.
  mediaRow: { flexDirection: 'row', gap: spacing.md },
  mediaLogoCol: { width: 92, gap: spacing.xs },
  mediaCoverCol: { flex: 1, gap: spacing.xs },
  mediaLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, color: colors.outline },
  mediaTileLogo: {
    height: 92,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ringBorder,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  mediaTileCover: {
    height: 92,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ringBorder,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  mediaTileHint: { fontSize: 10, fontWeight: '600', color: colors.primaryDark },
  mediaTileCta: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
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
    borderColor: colors.ringBorder,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  emptyVenueIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  emptyVenueTitle: { fontSize: 16, fontWeight: '800', color: colors.headingText },
  emptyVenueSubtitle: { fontSize: 12, color: colors.outline, textAlign: 'center' },
  emptyVenueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: colors.primaryDark,
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
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: spacing.sm,
    backgroundColor: colors.white,
  },
  venueSummaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueSummaryName: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  venueSummaryAddress: { fontSize: 12, color: colors.bodyText },

  adminField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.selectedBackground,
  },
  adminAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.headingText },
  adminBadge: { backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  adminBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.5 },

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

  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  doneButtonDisabled: { backgroundColor: colors.primaryDisabled },
  doneButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },

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
  allLevelsLabel: { fontSize: 14, fontWeight: '600', color: colors.headingText },
  allLevelsLabelActive: { color: colors.skillTierGreenText, fontWeight: '700' },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tierChip: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tierChipText: { fontSize: 13, fontWeight: '700' },

  joinModeCard: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: spacing.sm, gap: spacing.xxs, backgroundColor: colors.white },
  joinModeCardSelected: { borderColor: colors.primaryDark, backgroundColor: colors.selectedBackground },
  joinModeCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  joinModeTitle: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  joinModeTitleSelected: { color: colors.primaryDark },
  joinModeSubtext: { fontSize: 11, color: colors.outline },

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
});
