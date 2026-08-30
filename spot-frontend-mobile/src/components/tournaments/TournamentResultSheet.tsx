import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage } from '@/services/apiErrors';
import { setTournamentMatchResult } from '@/services/tournamentService';
import type { Sport } from '@/types/match';
import type { MatchResultPayload, TournamentMatch } from '@/types/tournament';

type Props = {
  visible: boolean;
  sport: Sport;
  match: TournamentMatch | null;
  onClose: () => void;
  onSaved: () => void;
};

type SetInput = { a: string; b: string };

const EMPTY_SETS: SetInput[] = [
  { a: '', b: '' },
  { a: '', b: '' },
  { a: '', b: '' },
];

/**
 * Enter / edit a tournament match result (Pencil "Tournament - Result
 * (Football/Badminton)" frames). Modal, opened only from the organizer Matches
 * tab (TournamentMatchListItem's "Enter Result" button). Football = goal
 * steppers with draw allowed; badminton = up to 3 BO3 sets, first-to-15.
 */
export default function TournamentResultSheet({ visible, sport, match, onClose, onSaved }: Props) {
  const isFootball = sport === 'FOOTBALL';
  const [goalsA, setGoalsA] = useState(0);
  const [goalsB, setGoalsB] = useState(0);
  const [sets, setSets] = useState<SetInput[]>(EMPTY_SETS);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible || !match) return;
    setError('');
    if (match.result?.type === 'FOOTBALL') {
      setGoalsA(match.result.teamAGoals);
      setGoalsB(match.result.teamBGoals);
    } else {
      setGoalsA(0);
      setGoalsB(0);
    }
    if (match.result?.type === 'BADMINTON') {
      const filled = match.result.sets.map((s) => ({ a: String(s.teamAPoints), b: String(s.teamBPoints) }));
      setSets([...filled, ...EMPTY_SETS].slice(0, 3));
    } else {
      setSets(EMPTY_SETS);
    }
  }, [visible, match]);

  if (!match) return null;

  const footballOutcome =
    goalsA === goalsB ? 'Draw' : `${goalsA > goalsB ? match.teamA.teamName : match.teamB.teamName} win`;

  const enteredSets = sets.filter((s) => s.a !== '' && s.b !== '');
  const setsA = enteredSets.filter((s) => Number(s.a) > Number(s.b)).length;
  const setsB = enteredSets.filter((s) => Number(s.b) > Number(s.a)).length;
  const badmintonPreview =
    enteredSets.length === 0
      ? 'Enter at least one set'
      : setsA >= 2 || setsB >= 2
        ? `${setsA} – ${setsB} · ${setsA > setsB ? match.teamA.teamName : match.teamB.teamName} win`
        : `${setsA} – ${setsB} · in progress`;

  const updateSet = (index: number, key: 'a' | 'b', text: string) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 2);
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: clean } : s)));
  };

  const handleSave = async () => {
    setError('');
    let payload: MatchResultPayload;
    if (isFootball) {
      payload = { teamAGoals: goalsA, teamBGoals: goalsB };
    } else {
      if (enteredSets.length === 0) {
        setError('Enter at least one set.');
        return;
      }
      payload = { sets: enteredSets.map((s) => ({ teamAPoints: Number(s.a), teamBPoints: Number(s.b) })) };
    }

    setIsSaving(true);
    try {
      await setTournamentMatchResult(match.tournamentId, match.matchId, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Enter Result</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {match.teamA.teamName} vs {match.teamB.teamName}
              </Text>
            </View>
            <TouchableOpacity testID="result-sheet-close" style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={16} color={colors.headingText} />
            </TouchableOpacity>
          </View>

          {isFootball ? (
            <View style={styles.footballRow}>
              <GoalStepper name={match.teamA.teamName} value={goalsA} onChange={setGoalsA} />
              <Text style={styles.footballDash}>–</Text>
              <GoalStepper name={match.teamB.teamName} value={goalsB} onChange={setGoalsB} />
            </View>
          ) : (
            <View style={styles.setList}>
              {sets.map((s, index) => (
                <View key={index} style={styles.setRow}>
                  <Text style={styles.setLabel}>Set {index + 1}</Text>
                  <TextInput
                    testID={`result-set-${index}-a`}
                    style={styles.setInput}
                    keyboardType="number-pad"
                    value={s.a}
                    onChangeText={(t) => updateSet(index, 'a', t)}
                  />
                  <Text style={styles.setDash}>–</Text>
                  <TextInput
                    testID={`result-set-${index}-b`}
                    style={styles.setInput}
                    keyboardType="number-pad"
                    value={s.b}
                    onChangeText={(t) => updateSet(index, 'b', t)}
                  />
                </View>
              ))}
              <Text style={styles.ruleHint}>Best of 3 · first to 15 · win by 2 · deuce at 15.</Text>
            </View>
          )}

          <View style={styles.previewPill}>
            <Ionicons name="trophy" size={13} color={colors.skillTierGreenText} />
            <Text style={styles.previewText}>{isFootball ? `${footballOutcome} · draw allowed` : badmintonPreview}</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            testID="result-sheet-save"
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Result'}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function GoalStepper({ name, value, onChange }: { name: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperName} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(value + 1)}>
        <Ionicons name="add" size={16} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(Math.max(0, value - 1))}>
        <Ionicons name="remove" size={16} color={colors.bodyText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.sheetOverlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: colors.headingText },
  subtitle: { fontSize: 12, color: colors.outline },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footballRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footballDash: { fontSize: 20, fontWeight: '800', color: colors.outline },
  stepper: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.md,
  },
  stepperName: { fontSize: 13, fontWeight: '700', color: colors.headingText },
  stepperBtn: {
    width: 34,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 30, fontWeight: '800', color: colors.headingText },

  setList: { gap: spacing.sm },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setLabel: { width: 48, fontSize: 13, fontWeight: '600', color: colors.bodyText },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.dotInactive,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.headingText,
    backgroundColor: colors.white,
  },
  setDash: { fontSize: 16, fontWeight: '700', color: colors.outline },
  ruleHint: { fontSize: 12, color: colors.outline },

  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.skillTierGreenBg,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  previewText: { fontSize: 13, fontWeight: '700', color: colors.skillTierGreenText },
  error: { fontSize: 12, color: colors.error },

  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
