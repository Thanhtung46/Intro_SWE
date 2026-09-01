import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { PendingAction } from '@/services/assistantService';
import { ChatMessage } from '@/types/assistant';

type Props = {
  message: ChatMessage;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Renders a proposed join/host action awaiting the player's explicit
 * confirmation (spec FR-010; data-model.md Pending Confirmation) — the
 * server, not this component, is the source of truth for whether the
 * action is still pending (research.md decision from specs/003-nlp-assistant/).
 */
export default function PendingActionCard({ message, onConfirm, onCancel }: Props) {
  const action = message.payload as PendingAction | undefined;
  const summary = action?.summary;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.text}>{message.text}</Text>
        {summary ? (
          <View style={styles.summary}>
            {summary.venueName ? <Text style={styles.summaryLine}>📍 {summary.venueName}</Text> : null}
            {summary.startsAt ? <Text style={styles.summaryLine}>🕒 {summary.startsAt}</Text> : null}
            {summary.spotsLeft !== undefined ? (
              <Text style={styles.summaryLine}>👥 {summary.spotsLeft} spots left</Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirm"
          >
            <Text style={styles.confirmText}>Xác nhận</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ringBorder,
    backgroundColor: colors.white,
    padding: 14,
    gap: 10,
  },
  text: {
    fontSize: 14,
    color: colors.headingText,
  },
  summary: {
    gap: 4,
  },
  summaryLine: {
    fontSize: 13,
    color: colors.bodyText,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.screenBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.bodyText,
  },
  confirmButton: {
    backgroundColor: colors.primaryDark,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
