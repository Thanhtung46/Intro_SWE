import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { rosterSizeFor } from '@/constants/tournamentFormats';
import type { JoinRosterRow } from '@/schemas/joinTournamentSchema';
import type { Sport } from '@/types/match';
import type { TournamentFormat } from '@/types/tournament';

export type RosterRow = JoinRosterRow & { key: string };

type Props = {
  sport: Sport;
  format: TournamentFormat;
  rows: RosterRow[];
  onChange: (rows: RosterRow[]) => void;
  rosterError?: string;
  rowErrors?: Record<number, string>; // index -> row error (name or jersey)
};

let seq = 0;
export function makeRosterRow(name = '', jerseyNumber = ''): RosterRow {
  seq += 1;
  return { key: `roster-${seq}`, name, jerseyNumber };
}

/**
 * Roster builder for the Join Tournament form (Pencil "Join (Football)" /
 * "Join (Badminton)" frames). Football: editable list of name + jersey rows,
 * add up to format size + 5, remove down to 1. Badminton: a fixed number of
 * name-only rows (1 for singles, 2 for doubles/mixed) — no add/remove.
 */
export default function RosterBuilder({ sport, format, rows, onChange, rosterError, rowErrors }: Props) {
  const isFootball = sport === 'FOOTBALL';
  const maxSize = rosterSizeFor(sport, format);

  const updateRow = (index: number, patch: Partial<JoinRosterRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };
  const addRow = () => {
    if (rows.length >= maxSize) return;
    onChange([...rows, makeRosterRow()]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{isFootball ? 'Squad' : 'Players'}</Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {rows.length} / {maxSize}
          </Text>
        </View>
      </View>

      {rows.map((row, index) => {
        const rowError = rowErrors?.[index];
        return (
          <View key={row.key} style={styles.rowGroup}>
            <View style={styles.row}>
              <TextInput
                testID={`roster-name-${index}`}
                style={[styles.nameInput, isFootball && styles.nameInputFootball, rowError && styles.inputError]}
                placeholder={index === 0 ? 'Captain name' : 'Player name'}
                placeholderTextColor={colors.outline}
                value={row.name}
                onChangeText={(text) => updateRow(index, { name: text })}
              />
              {isFootball && (
                <TextInput
                  testID={`roster-jersey-${index}`}
                  style={[styles.jerseyInput, rowError && styles.inputError]}
                  placeholder="#"
                  placeholderTextColor={colors.outline}
                  keyboardType="number-pad"
                  maxLength={3}
                  value={row.jerseyNumber}
                  onChangeText={(text) => updateRow(index, { jerseyNumber: text.replace(/[^0-9]/g, '') })}
                />
              )}
              {isFootball && rows.length > 1 && (
                <TouchableOpacity
                  testID={`roster-remove-${index}`}
                  style={styles.removeButton}
                  onPress={() => removeRow(index)}
                >
                  <Ionicons name="close" size={16} color={colors.bodyText} />
                </TouchableOpacity>
              )}
            </View>
            {rowError ? <Text style={styles.errorText}>{rowError}</Text> : null}
          </View>
        );
      })}

      {isFootball && rows.length < maxSize && (
        <TouchableOpacity testID="roster-add" style={styles.addButton} onPress={addRow}>
          <Ionicons name="add" size={15} color={colors.primaryDark} />
          <Text style={styles.addButtonText}>Add Player</Text>
        </TouchableOpacity>
      )}

      {isFootball ? (
        <Text style={styles.hint}>Jersey numbers must be unique within the team.</Text>
      ) : (
        <Text style={styles.hint}>
          {maxSize === 1 ? 'Singles needs 1 player.' : 'Doubles / mixed needs exactly 2 players.'}
        </Text>
      )}
      {rosterError ? <Text style={styles.errorText}>{rosterError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', color: colors.headingText },
  counter: { backgroundColor: colors.iconBackground, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  counterText: { fontSize: 12, fontWeight: '700', color: colors.bodyText },

  rowGroup: { gap: spacing.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.headingText,
    backgroundColor: colors.white,
  },
  nameInputFootball: {},
  jerseyInput: {
    width: 54,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 14,
    color: colors.headingText,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.error },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  addButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  hint: { fontSize: 12, color: colors.outline },
  errorText: { fontSize: 12, color: colors.error },
});
