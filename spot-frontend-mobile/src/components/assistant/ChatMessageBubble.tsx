import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { MatchResult, VenueResult } from '@/services/assistantService';
import { ChatMessage } from '@/types/assistant';
import ResultCard from './ResultCard';

type Props = {
  message: ChatMessage;
  onResultPress?: (result: MatchResult) => void;
  onVenuePress?: (venue: VenueResult) => void;
};

/**
 * Renders one conversation turn by kind (data-model.md Chat Message) —
 * "pendingAction" is rendered separately as a PendingActionCard by the
 * screen (User Story 3), not here. Bubble background switches on `kind` so
 * a clarifying question / error reads distinct from a normal answer at a
 * glance (spec 001-assistant-chat-ui-redesign FR-006/FR-007).
 */
export default function ChatMessageBubble({ message, onResultPress, onVenuePress }: Props) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const isPlayer = message.role === 'player';
  const isError = message.kind === 'error';
  const isClarifying = message.kind === 'clarifying';

  return (
    <View style={[styles.row, isPlayer ? styles.rowPlayer : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isPlayer ? styles.bubblePlayer : styles.bubbleAssistant,
          isClarifying && styles.bubbleClarifying,
          isError && styles.bubbleError,
        ]}
      >
        <Text style={[styles.text, isPlayer ? styles.textPlayer : styles.textAssistant]}>
          {message.text}
        </Text>

        {message.kind === 'results' && Array.isArray(message.payload) ? (
          <View style={styles.resultsList}>
            {(message.payload as MatchResult[]).map((result) => (
              <ResultCard
                key={result.matchId}
                variant="match"
                result={result}
                onPress={() => onResultPress?.(result)}
              />
            ))}
          </View>
        ) : null}

        {message.kind === 'venueResults' && Array.isArray(message.payload) ? (
          <View style={styles.resultsList}>
            {(message.payload as VenueResult[]).map((venue) => (
              <ResultCard
                key={venue.venueId}
                variant="venue"
                result={venue}
                onPress={() => onVenuePress?.(venue)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
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
      backgroundColor: c.primary,
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      backgroundColor: c.glassCardBg,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      borderBottomLeftRadius: 4,
    },
    bubbleClarifying: {
      backgroundColor: c.warningSurface,
      borderColor: c.warningText,
    },
    bubbleError: {
      backgroundColor: c.dangerSurface,
      borderColor: c.error,
    },
    text: {
      fontSize: 14,
    },
    textPlayer: {
      color: c.white,
    },
    textAssistant: {
      color: c.textPrimary,
    },
    resultsList: {
      marginTop: 8,
      gap: 8,
    },
  });
}
