import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import SubmitButton from '@/components/common/SubmitButton';
import DateTimeField from '@/components/tournaments/DateTimeField';
import { SelectField } from '@/components/SelectField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { ROUND_LABELS, ROUND_ORDER } from '@/constants/tournamentFormats';
import { getErrorMessage } from '@/services/apiErrors';
import { createTournamentMatch, deleteTournamentMatch, updateTournamentMatch } from '@/services/tournamentService';
import type {
  CreateTournamentMatchPayload,
  TournamentDetail,
  TournamentMatch,
  TournamentRound,
  TournamentTeam,
} from '@/types/tournament';

type Props = {
  tournament: TournamentDetail;
  teams: TournamentTeam[];
  initialMatch?: TournamentMatch;
  onBack: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

const ROUND_OPTIONS = ROUND_ORDER.map((r) => ({ label: ROUND_LABELS[r], value: r }));

export default function EditTournamentMatchScreen({
  tournament,
  teams,
  initialMatch,
  onBack,
  onSaved,
  onDeleted,
}: Props) {
  const mode = initialMatch ? 'edit' : 'create';
  const [round, setRound] = useState<string>(initialMatch?.round ?? '');
  const [teamAId, setTeamAId] = useState<string>(initialMatch ? String(initialMatch.teamA.teamId) : '');
  const [teamBId, setTeamBId] = useState<string>(initialMatch ? String(initialMatch.teamB.teamId) : '');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(
    initialMatch ? new Date(initialMatch.scheduledAt) : null
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const canPickTeams = teams.length >= 2;
  const teamOptions = useMemo(
    () => teams.map((t) => ({ label: t.teamName, value: String(t.teamId) })),
    [teams]
  );
  // Opponent lists exclude the other side — a team cannot play itself.
  const teamAOptions = useMemo(
    () => teamOptions.filter((o) => o.value !== teamBId),
    [teamOptions, teamBId]
  );
  const teamBOptions = useMemo(
    () => teamOptions.filter((o) => o.value !== teamAId),
    [teamOptions, teamAId]
  );
  const starts = new Date(tournament.startsAt);
  const ends = new Date(tournament.endsAt);

  const handleTeamAChange = (value: string) => {
    setTeamAId(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.teamAId;
      delete next.teamBId;
      return next;
    });
    // Picking A that was already B clears B so the form never holds A vs A.
    if (value && value === teamBId) setTeamBId('');
  };

  const handleTeamBChange = (value: string) => {
    setTeamBId(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.teamAId;
      delete next.teamBId;
      return next;
    });
    if (value && value === teamAId) setTeamAId('');
  };

  const validate = (): CreateTournamentMatchPayload | null => {
    const errors: Record<string, string> = {};
    if (!canPickTeams) {
      errors.teamAId = 'Need at least two accepted teams';
      setFieldErrors(errors);
      return null;
    }
    if (!round) errors.round = 'Pick a round';
    if (!teamAId) errors.teamAId = 'Pick team A';
    if (!teamBId) errors.teamBId = 'Pick team B';
    if (teamAId && teamBId && teamAId === teamBId) {
      errors.teamBId = 'Team B must be a different team';
    }
    if (!scheduledAt) {
      errors.scheduledAt = 'Pick a date and time';
    } else if (scheduledAt < starts || scheduledAt > ends) {
      errors.scheduledAt = `Must be between ${starts.toLocaleDateString('en-US')} and ${ends.toLocaleDateString('en-US')}`;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return null;
    return {
      round: round as TournamentRound,
      teamAId: Number(teamAId),
      teamBId: Number(teamBId),
      scheduledAt: scheduledAt!.toISOString(),
    };
  };

  const handleSubmit = async () => {
    setSubmitError('');
    const payload = validate();
    if (!payload) return;

    setIsSubmitting(true);
    try {
      if (mode === 'edit' && initialMatch) {
        await updateTournamentMatch(tournament.tournamentId, initialMatch.matchId, payload);
      } else {
        await createTournamentMatch(tournament.tournamentId, payload);
      }
      onSaved();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!initialMatch) return;
    setDeleteVisible(false);
    try {
      await deleteTournamentMatch(tournament.tournamentId, initialMatch.matchId);
      onDeleted();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="edit-match-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{mode === 'edit' ? 'Edit Match' : 'Add Match'}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {tournament.title}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}

        {!canPickTeams ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.outline} />
            <Text style={styles.noticeText}>
              Accept at least two teams before scheduling matches. A team cannot play itself.
            </Text>
          </View>
        ) : null}

        <SelectField
          label="Round"
          placeholder="Select round"
          value={round}
          onChange={setRound}
          options={ROUND_OPTIONS}
          error={fieldErrors.round}
        />
        <SelectField
          label="Team A"
          placeholder={canPickTeams ? 'Select team' : 'Need 2+ teams'}
          value={teamAId}
          onChange={handleTeamAChange}
          options={teamAOptions}
          error={fieldErrors.teamAId}
          disabled={!canPickTeams}
        />
        <View style={styles.vsRow}>
          <Text style={styles.vsText}>vs</Text>
        </View>
        <SelectField
          label="Team B"
          placeholder={canPickTeams ? (teamAId ? 'Select opponent' : 'Select team A first') : 'Need 2+ teams'}
          value={teamBId}
          onChange={handleTeamBChange}
          options={teamBOptions}
          error={fieldErrors.teamBId}
          disabled={!canPickTeams}
        />
        <DateTimeField
          label="Date & Time"
          value={scheduledAt}
          error={fieldErrors.scheduledAt}
          onChange={setScheduledAt}
        />
        <Text style={styles.helperText}>
          Venue is the tournament venue. {mode === 'edit' ? 'Changing either team clears the recorded result.' : ''}
        </Text>

        <SubmitButton
          label={mode === 'edit' ? 'Save Match' : 'Add Match'}
          loading={isSubmitting}
          onPress={handleSubmit}
          disabled={!canPickTeams}
        />

        {mode === 'edit' && (
          <TouchableOpacity testID="edit-match-delete" style={styles.deleteButton} onPress={() => setDeleteVisible(true)}>
            <Ionicons name="trash-outline" size={15} color={colors.error} />
            <Text style={styles.deleteButtonText}>Delete Match</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete this match?"
        message="This removes the match and any recorded result. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.headingText },
  subtitle: { fontSize: 12, color: colors.outline },

  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.formScreenBackground,
    borderRadius: 10,
    padding: spacing.sm,
  },
  noticeText: { flex: 1, fontSize: 12, color: colors.outline },

  vsRow: { alignItems: 'center' },
  vsText: { fontSize: 12, fontWeight: '700', color: colors.outline },
  helperText: { fontSize: 12, color: colors.outline },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  deleteButtonText: { fontSize: 13, fontWeight: '700', color: colors.error },
});
