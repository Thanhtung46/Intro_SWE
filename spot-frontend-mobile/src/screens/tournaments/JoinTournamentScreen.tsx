import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import FormField from '@/components/common/FormField';
import SubmitButton from '@/components/common/SubmitButton';
import RosterBuilder, { makeRosterRow, type RosterRow } from '@/components/tournaments/RosterBuilder';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { rosterSizeFor } from '@/constants/tournamentFormats';
import { makeJoinTournamentSchema } from '@/schemas/joinTournamentSchema';
import { getErrorMessage } from '@/services/apiErrors';
import { getMe } from '@/services/authService';
import { joinTournament } from '@/services/tournamentService';
import type { JoinTournamentPayload, RosterInput, TournamentDetail } from '@/types/tournament';

type Props = {
  tournament: TournamentDetail;
  onBack: () => void;
  onJoined: () => void;
};

/**
 * Join Tournament — captain registration form (Pencil "Join (Football)" /
 * "Join (Badminton)" frames). Widget-heavy → local useState + safeParse on
 * submit, same as CreateGroupScreen. sport/format come from the tournament
 * (fetched by the route) and drive the RosterBuilder rules.
 */
export default function JoinTournamentScreen({ tournament, onBack, onJoined }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const { sport, format } = tournament;
  const isFootball = sport === 'FOOTBALL';
  const maxSize = rosterSizeFor(sport, format);

  const [captainName, setCaptainName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('');
  const [roster, setRoster] = useState<RosterRow[]>(() =>
    isFootball
      ? [makeRosterRow()]
      : Array.from({ length: maxSize }, () => makeRosterRow())
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => {
        const name = me.fullName ?? '';
        setCaptainName(name);
        setRoster((prev) =>
          prev.length && !prev[0].name ? prev.map((r, i) => (i === 0 ? { ...r, name } : r)) : prev
        );
      })
      .catch(() => undefined);
  }, []);

  const schema = useMemo(() => makeJoinTournamentSchema(sport, format, t), [sport, format, t]);

  const handleSubmit = async () => {
    setSubmitError('');
    const parsed = schema.safeParse({
      teamName,
      teamLogoUrl,
      roster: roster.map((r) => ({ name: r.name, jerseyNumber: r.jerseyNumber })),
    });

    if (!parsed.success) {
      const nextFields: Record<string, string> = {};
      const nextRows: Record<number, string> = {};
      for (const issue of parsed.error.issues) {
        const [head, index] = issue.path;
        if (head === 'roster' && typeof index === 'number') {
          nextRows[index] = issue.message;
        } else if (head === 'roster') {
          nextFields.roster = issue.message;
        } else if (typeof head === 'string') {
          nextFields[head] = issue.message;
        }
      }
      setFieldErrors(nextFields);
      setRowErrors(nextRows);
      return;
    }

    setFieldErrors({});
    setRowErrors({});

    const rosterPayload: RosterInput[] = parsed.data.roster.map((r) =>
      isFootball ? { name: r.name, jerseyNumber: Number(r.jerseyNumber) } : { name: r.name }
    );
    const payload: JoinTournamentPayload = {
      teamName: parsed.data.teamName,
      teamLogoUrl: parsed.data.teamLogoUrl,
      roster: rosterPayload,
    };

    setIsSubmitting(true);
    try {
      await joinTournament(tournament.tournamentId, payload);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.doneWrap} edges={['top', 'bottom']}>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark" size={34} color={colors.white} />
        </View>
        <Text style={styles.doneTitle}>{t('tournaments.join.sentTitle')}</Text>
        <Text style={styles.doneText}>{t('tournaments.join.sentMessage')}</Text>
        <TouchableOpacity testID="join-tournament-done" style={styles.doneButton} onPress={onJoined}>
          <Text style={styles.doneButtonText}>{t('tournaments.join.done')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="join-tournament-back" style={styles.backButton} onPress={onBack} accessibilityLabel={t('tournaments.common.back')}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('tournaments.join.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {tournament.title}
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.badge}>
              <Ionicons name="trophy" size={11} color={colors.primary} />
              <Text style={styles.badgeText}>{tournament.formatBadge}</Text>
            </View>
            <Text style={styles.heroCaption}>
              {t('tournaments.join.registeringCaptain')}{captainName ? ` · ${captainName}` : ''}
            </Text>
          </View>
        </View>

        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tournaments.join.yourTeam')}</Text>
          <FormField
            label={t('tournaments.join.teamName')}
            placeholder={t('tournaments.join.teamNamePlaceholder')}
            value={teamName}
            onChangeText={setTeamName}
            error={fieldErrors.teamName}
          />
          <FormField
            label={t('tournaments.join.logoUrl')}
            placeholder={t('tournaments.join.logoUrlPlaceholder')}
            autoCapitalize="none"
            keyboardType="url"
            value={teamLogoUrl}
            onChangeText={setTeamLogoUrl}
            error={fieldErrors.teamLogoUrl}
          />
        </View>

        <View style={styles.card}>
          <RosterBuilder
            sport={sport}
            format={format}
            rows={roster}
            onChange={setRoster}
            rosterError={fieldErrors.roster}
            rowErrors={rowErrors}
          />
        </View>

        <SubmitButton label={t('tournaments.join.submit')} loading={isSubmitting} onPress={handleSubmit} />
        <Text style={styles.footnote}>{t('tournaments.join.reviewNotice')}</Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackgroundAlt },
  keyboardAvoider: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
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

  heroCard: {
    backgroundColor: colors.tintedSurface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heroTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  heroCaption: { fontSize: 12, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  footnote: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },

  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.screenBackgroundAlt,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  doneText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  doneButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  doneButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
