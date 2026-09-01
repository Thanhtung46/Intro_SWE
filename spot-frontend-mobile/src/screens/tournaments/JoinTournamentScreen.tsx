import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import FormField from '@/components/common/FormField';
import SubmitButton from '@/components/common/SubmitButton';
import RosterBuilder, { makeRosterRow, type RosterRow } from '@/components/tournaments/RosterBuilder';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
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

  const schema = useMemo(() => makeJoinTournamentSchema(sport, format), [sport, format]);

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
        <Text style={styles.doneTitle}>Request sent</Text>
        <Text style={styles.doneText}>
          The organizer will review your team. You'll see the status under Manage Tournaments → Joined.
        </Text>
        <TouchableOpacity testID="join-tournament-done" style={styles.doneButton} onPress={onJoined}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="join-tournament-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Tournament</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {tournament.title}
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.badge}>
              <Ionicons name="trophy" size={11} color={colors.primaryDark} />
              <Text style={styles.badgeText}>{tournament.formatBadge}</Text>
            </View>
            <Text style={styles.heroCaption}>
              Registering as captain{captainName ? ` · ${captainName}` : ''}
            </Text>
          </View>
        </View>

        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Team</Text>
          <FormField
            label="Team Name"
            placeholder="e.g. Thunder FC"
            value={teamName}
            onChangeText={setTeamName}
            error={fieldErrors.teamName}
          />
          <FormField
            label="Team Logo URL"
            placeholder="https://..."
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

        <SubmitButton label="Send Join Request" loading={isSubmitting} onPress={handleSubmit} />
        <Text style={styles.footnote}>The organizer reviews every join request.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
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
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.headingText },

  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },

  heroCard: {
    backgroundColor: colors.selectedBackground,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heroTitle: { fontSize: 15, fontWeight: '700', color: colors.headingText },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  heroCaption: { fontSize: 12, color: colors.bodyText },

  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.headingText },

  footnote: { fontSize: 12, color: colors.outline, textAlign: 'center' },

  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.screenBackground,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.headingText },
  doneText: { fontSize: 14, color: colors.bodyText, textAlign: 'center', lineHeight: 20 },
  doneButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  doneButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
