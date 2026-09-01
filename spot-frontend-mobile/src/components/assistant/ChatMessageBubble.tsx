import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { MatchResult } from '@/services/assistantService';
import { ChatMessage } from '@/types/assistant';

type Props = {
  message: ChatMessage;
  onResultPress?: (result: MatchResult) => void;
};

/**
 * Renders one conversation turn by kind (data-model.md Chat Message) —
 * "pendingAction" is rendered separately as a PendingActionCard by the
 * screen (User Story 3), not here.
 */
export default function ChatMessageBubble({ message, onResultPress }: Props) {
  const isPlayer = message.role === 'player';
  const isError = message.kind === 'error';

  return (
    <View style={[styles.row, isPlayer ? styles.rowPlayer : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isPlayer ? styles.bubblePlayer : styles.bubbleAssistant,
          isError && styles.bubbleError,
        ]}
      >
        <Text style={[styles.text, isPlayer ? styles.textPlayer : styles.textAssistant]}>
          {message.text}
        </Text>

        {message.kind === 'results' && Array.isArray(message.payload) ? (
          <View style={styles.resultsList}>
            {(message.payload as MatchResult[]).map((result) => (
              <TouchableOpacity
                key={result.matchId}
                style={styles.resultItem}
                onPress={() => onResultPress?.(result)}
                accessibilityRole="button"
              >
                <Text style={styles.resultTitle}>{result.title}</Text>
                <Text style={styles.resultMeta}>
                  {result.venueName} · {result.spotsLeft} spots left
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  rowPlayer: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubblePlayer: {
    backgroundColor: colors.primaryDark,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.glassBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
  },
  text: {
    fontSize: 14,
  },
  textPlayer: {
    color: colors.white,
  },
  textAssistant: {
    color: colors.headingText,
  },
  resultsList: {
    marginTop: 8,
    gap: 8,
  },
  resultItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.headingText,
  },
  resultMeta: {
    fontSize: 12,
    color: colors.bodyText,
    marginTop: 2,
  },
});
