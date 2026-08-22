import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import FormField from '@/components/common/FormField';
import InfoDialog from '@/components/common/InfoDialog';
import SubmitButton from '@/components/common/SubmitButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillLabel, skillTierColor, skillsForSport } from '@/constants/matchSkills';
import { useUser } from '@/context/UserContext';
import { joinMatchSchema, type JoinMatchFormInput, type JoinMatchFormValues } from '@/schemas/joinMatchSchema';
import { getErrorMessage, joinMatch } from '@/services/matchService';
import { getMe } from '@/services/authService';
import type { CurrentUserProfile } from '@/types/auth';
import type { FeeGender, Sport } from '@/types/match';

type Props = {
  visible: boolean;
  matchId: number;
  matchTitle: string;
  sport: Sport;
  requiredSkillLabels?: string[]; // e.g. ["Beginner", "Basic Amateur"] banner, empty if allLevels
  onClose: () => void;
  onSubmitted: () => void;
};

const EMPTY_GUEST = { name: '', skill: '', gender: 'male' as FeeGender, phoneNumber: '' };
const MAX_GUESTS = 10;

/**
 * Join Match sheet (Figma node 100:551 / edit-mode 537:253, SPOT-76).
 * Self-contained Modal like FilterSheet.tsx — rendered from
 * MatchDetailScreen as an overlay, not a route.
 *
 * "You" card is READ-ONLY for Gender/Skill (plan mục 2.2, locked product
 * decision — Figma's 537:253 shows them editable, but Gender/Skill belong
 * to Profile, not a per-join override). Only Phone + Message are editable.
 */
export default function JoinMatchSheet({ visible, matchId, matchTitle, sport, requiredSkillLabels, onClose, onSubmitted }: Props) {
  const { user } = useUser();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [resultDialog, setResultDialog] = useState<{ tone: 'success' | 'warning'; title: string; message: string } | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<JoinMatchFormInput, unknown, JoinMatchFormValues>({
    resolver: zodResolver(joinMatchSchema),
    defaultValues: { message: '', phoneNumber: '', guests: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'guests' });

  useEffect(() => {
    if (!visible) return;
    setSubmitError('');
    reset({ message: '', phoneNumber: '', guests: [] });
    setProfileLoading(true);
    getMe({ fullName: user?.fullName, phoneNumber: user?.phoneNumber })
      .then((result) => setProfile(result))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [visible, user?.fullName, user?.phoneNumber, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');
    try {
      const result = await joinMatch(matchId, values);
      onClose();
      setResultDialog(
        result.skillWarning
          ? {
              tone: 'warning',
              title: 'Request Sent — Skill Warning',
              message:
                result.warning ?? 'Your skill (or a guest skill) is outside this match range, but the request was still sent.',
            }
          : { tone: 'success', title: 'Request Sent', message: "You'll be notified once the host responds." }
      );
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  });

  const sportSkillKey = sport === 'FOOTBALL' ? 'football' : 'badminton';
  const profileSkillLabel = profile ? skillLabel(sport, profile.skills[sportSkillKey]) : null;

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Join Match</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {matchTitle}
              </Text>
            </View>
            <TouchableOpacity testID="join-sheet-close" style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={16} color={colors.headingText} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {requiredSkillLabels && requiredSkillLabels.length > 0 && (
              <View style={styles.skillBanner}>
                <View style={styles.skillBannerIcon}>
                  <Ionicons name="alert" size={18} color={colors.white} />
                </View>
                <View style={styles.skillBannerTextWrap}>
                  <Text style={styles.skillBannerLabel}>REQUIRED SKILL LEVEL</Text>
                  <View style={styles.skillBannerChips}>
                    {requiredSkillLabels.map((label) => (
                      <View key={label} style={styles.skillBannerChip}>
                        <Text style={styles.skillBannerChipText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.youAvatar}>
                    <Ionicons name="person" size={16} color={colors.white} />
                  </View>
                  <Text style={styles.cardHeaderTitle}>You{profile?.fullName ? ` (${profile.fullName})` : ''}</Text>
                </View>
              </View>

              {profileLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <View style={styles.row}>
                    <View style={styles.rowItem}>
                      <Text style={styles.readOnlyLabel}>Gender</Text>
                      <Text style={styles.readOnlyValue}>{profile?.gender ?? '—'}</Text>
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={styles.readOnlyLabel}>Skill Level</Text>
                      <Text style={styles.readOnlyValue}>{profileSkillLabel ?? 'Not set'}</Text>
                    </View>
                  </View>

                  <Controller
                    control={control}
                    name="phoneNumber"
                    render={({ field, fieldState }) => (
                      <FormField
                        testID="join-sheet-phone"
                        label="Phone"
                        placeholder={profile?.phoneNumber || 'Enter phone number'}
                        value={field.value}
                        onChangeText={field.onChange}
                        keyboardType="phone-pad"
                        error={fieldState.error?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="message"
                    render={({ field, fieldState }) => (
                      <FormField
                        testID="join-sheet-message"
                        label="Message to Host (Optional)"
                        placeholder="Say something to the host..."
                        value={field.value}
                        onChangeText={field.onChange}
                        multiline
                        numberOfLines={3}
                        style={styles.messageInput}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </>
              )}
            </View>

            {fields.map((guestField, index) => (
              <View key={guestField.id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.guestAvatar}>
                      <Ionicons name="person-add-outline" size={14} color={colors.primaryDark} />
                    </View>
                    <Text style={styles.cardHeaderTitle}>Guest {index + 1}</Text>
                  </View>
                  <TouchableOpacity testID={`join-sheet-remove-guest-${index}`} onPress={() => remove(index)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>

                <Controller
                  control={control}
                  name={`guests.${index}.name`}
                  render={({ field, fieldState }) => (
                    <FormField
                      testID={`join-sheet-guest-name-${index}`}
                      label="Guest Name *"
                      placeholder="Enter guest name"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name={`guests.${index}.phoneNumber`}
                  render={({ field, fieldState }) => (
                    <FormField
                      testID={`join-sheet-guest-phone-${index}`}
                      label="Guest Phone *"
                      placeholder="0901234567"
                      value={field.value}
                      onChangeText={field.onChange}
                      keyboardType="phone-pad"
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <View style={styles.section}>
                  <Text style={styles.fieldLabel}>Guest Gender *</Text>
                  <Controller
                    control={control}
                    name={`guests.${index}.gender`}
                    render={({ field }) => (
                      <View style={styles.genderToggle}>
                        {(['male', 'female'] as FeeGender[]).map((gender) => (
                          <TouchableOpacity
                            key={gender}
                            testID={`join-sheet-guest-gender-${index}-${gender}`}
                            style={[styles.genderButton, field.value === gender && styles.genderButtonActive]}
                            onPress={() => field.onChange(gender)}
                          >
                            <Text style={[styles.genderButtonText, field.value === gender && styles.genderButtonTextActive]}>
                              {gender === 'male' ? 'Male' : 'Female'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.fieldLabel}>Guest Skill *</Text>
                  <Controller
                    control={control}
                    name={`guests.${index}.skill`}
                    render={({ field, fieldState }) => (
                      <>
                        <View style={styles.skillGrid}>
                          {skillsForSport(sport).map((skill) => {
                            const selected = field.value === skill.code;
                            const tier = skillTierColor(sport, skill.code);
                            return (
                              <TouchableOpacity
                                key={skill.code}
                                testID={`join-sheet-guest-skill-${index}-${skill.code}`}
                                style={[styles.skillChip, { backgroundColor: selected ? tier.text : tier.bg, borderColor: tier.border }]}
                                onPress={() => field.onChange(skill.code)}
                              >
                                <Text style={[styles.skillChipText, { color: selected ? colors.white : tier.text }]}>{skill.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        {fieldState.error?.message ? <Text style={styles.fieldError}>{fieldState.error.message}</Text> : null}
                      </>
                    )}
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity
              testID="join-sheet-add-guest"
              style={[styles.addGuestButton, fields.length >= MAX_GUESTS && styles.addGuestButtonDisabled]}
              onPress={() => fields.length < MAX_GUESTS && append(EMPTY_GUEST)}
              disabled={fields.length >= MAX_GUESTS}
            >
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={styles.addGuestButtonText}>Add Guest</Text>
            </TouchableOpacity>

            {submitError ? <ErrorBanner message={submitError} onRetry={onSubmit} /> : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity testID="join-sheet-cancel" style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.submitWrap}>
              <SubmitButton label={`Send Request (${1 + fields.length})`} loading={isSubmitting} onPress={onSubmit} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>

    <InfoDialog
      visible={resultDialog != null}
      tone={resultDialog?.tone ?? 'success'}
      title={resultDialog?.title ?? ''}
      message={resultDialog?.message ?? ''}
      onDismiss={() => {
        setResultDialog(null);
        onSubmitted();
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.sheetOverlay, justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.screenBackground, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.iconBackground,
  },
  headerText: { flex: 1, marginRight: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.headingText },
  subtitle: { fontSize: 13, color: colors.bodyText },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.md, gap: spacing.md },
  messageInput: { height: 90, paddingTop: spacing.sm, textAlignVertical: 'top' },

  skillBanner: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.skillTierOrangeBg, borderRadius: 12, padding: spacing.md },
  skillBannerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.skillTierOrangeText, alignItems: 'center', justifyContent: 'center' },
  skillBannerTextWrap: { flex: 1, gap: spacing.xxs },
  skillBannerLabel: { fontSize: 10, fontWeight: '800', color: colors.skillTierOrangeText, letterSpacing: 0.5 },
  skillBannerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
  skillBannerChip: { backgroundColor: colors.skillBannerChipBackground, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  skillBannerChipText: { fontSize: 12, fontWeight: '700', color: colors.skillTierOrangeText },

  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  youAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  guestAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.iconBackground, alignItems: 'center', justifyContent: 'center' },
  cardHeaderTitle: { fontSize: 16, fontWeight: '700', color: colors.headingText },

  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1, gap: spacing.xxs },
  readOnlyLabel: { fontSize: 12, fontWeight: '700', color: colors.bodyText },
  readOnlyValue: { fontSize: 15, fontWeight: '600', color: colors.headingText },

  section: { gap: spacing.xxs },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.bodyText },
  fieldError: { fontSize: 12, color: colors.error },

  genderToggle: { flexDirection: 'row', gap: spacing.sm },
  genderButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  genderButtonActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  genderButtonText: { fontSize: 13, fontWeight: '700', color: colors.headingText },
  genderButtonTextActive: { color: colors.white },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  skillChipText: { fontSize: 13, fontWeight: '700' },

  addGuestButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addGuestButtonDisabled: { backgroundColor: colors.outline },
  addGuestButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.iconBackground,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.selectedBackground,
    borderRadius: 16,
  },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: colors.headingText },
  submitWrap: { flex: 2 },
});
