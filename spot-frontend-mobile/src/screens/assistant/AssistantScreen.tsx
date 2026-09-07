import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { venueDetailRoute } from '@/constants/routes';
import ChatMessageBubble from '@/components/assistant/ChatMessageBubble';
import PendingActionCard from '@/components/assistant/PendingActionCard';
import TypingIndicator from '@/components/assistant/TypingIndicator';
import VoiceRecorderButton from '@/components/assistant/VoiceRecorderButton';
import {
  AssistantReply,
  ConflictAlternative,
  MatchResult,
  VenueResult,
  clearConversation,
  getHistory,
  getOrCreateConversationId,
  sendMessage,
  startNewConversation,
} from '@/services/assistantService';
import { ChatMessage, nextMessageId } from '@/types/assistant';

type Props = {
  onBack: () => void;
};

function replyToChatMessage(reply: AssistantReply): ChatMessage {
  if (reply.pendingAction) {
    return {
      id: nextMessageId(),
      role: 'assistant',
      kind: 'pendingAction',
      text: reply.text,
      payload: reply.pendingAction,
      timestamp: new Date().toISOString(),
    };
  }
  if (reply.results) {
    return {
      id: nextMessageId(),
      role: 'assistant',
      kind: 'results',
      text: reply.text,
      payload: reply.results,
      timestamp: new Date().toISOString(),
    };
  }
  if (reply.venueResults) {
    return {
      id: nextMessageId(),
      role: 'assistant',
      kind: 'venueResults',
      text: reply.text,
      payload: reply.venueResults,
      timestamp: new Date().toISOString(),
    };
  }
  if (reply.clarifyingQuestion) {
    return {
      id: nextMessageId(),
      role: 'assistant',
      kind: 'clarifying',
      text: reply.text,
      timestamp: new Date().toISOString(),
    };
  }
  return {
    id: nextMessageId(),
    role: 'assistant',
    kind: 'text',
    text: reply.text,
    timestamp: new Date().toISOString(),
  };
}

function conflictToChatMessage(message: string, alternative: ConflictAlternative | null): ChatMessage {
  const suffix = alternative ? ` Gợi ý khác: ${alternative.title}.` : '';
  return {
    id: nextMessageId(),
    role: 'assistant',
    kind: 'error',
    text: `${message}${suffix}`,
    timestamp: new Date().toISOString(),
  };
}

/** AI assistant chat (spec 004-ai-features-frontend-integration, User Stories 2-4). */
export default function AssistantScreen({ onBack }: Props) {
  const router = useRouter();
  const { mode, colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getOrCreateConversationId().then(async (id) => {
      setConversationId(id);
      const history = await getHistory(id);
      setMessages(
        history.map((item) => ({
          id: nextMessageId(),
          role: item.role,
          kind: 'text',
          text: item.text,
          timestamp: item.timestamp,
        })),
      );
    });
  }, []);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  useEffect(() => {
    if (sending) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [sending]);

  const handleSend = async (text: string) => {
    if (!conversationId || sending) return;
    const playerMessage: ChatMessage = {
      id: nextMessageId(),
      role: 'player',
      kind: 'text',
      text,
      sendState: 'sending',
      timestamp: new Date().toISOString(),
    };
    appendMessage(playerMessage);
    setSending(true);

    const result = await sendMessage(conversationId, { inputMode: 'text', text });

    setMessages((prev) =>
      prev.map((m) => (m.id === playerMessage.id ? { ...m, sendState: 'sent' } : m)),
    );

    if (result.outcome === 'ok') {
      appendMessage(replyToChatMessage(result.reply));
      if (result.reply.bookingHandoff) {
        // Hand-off only — no booking was created (spec
        // 007-assistant-venue-search FR-010). The player still reviews
        // and confirms in the venue's own booking screen, pre-filled with
        // the date/time they asked for.
        const { venueId, date, timeFrom } = result.reply.bookingHandoff;
        router.push(venueDetailRoute(String(venueId), undefined, { date, timeFrom }));
      }
    } else if (result.outcome === 'unavailable') {
      appendMessage({
        id: nextMessageId(),
        role: 'assistant',
        kind: 'error',
        text: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      appendMessage(conflictToChatMessage(result.message, result.alternative));
    }

    setSending(false);
  };

  const handleSendText = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText('');
    handleSend(trimmed);
  };

  const handleResultPress = (result: MatchResult) => {
    router.push(`/matches/${result.matchId}`);
  };

  const handleVenuePress = (venue: VenueResult) => {
    router.push(venueDetailRoute(String(venue.venueId)));
  };

  const handleConfirmAction = (actionText: string) => {
    handleSend(actionText);
  };

  const handleClearConversation = () => {
    if (!conversationId || sending || messages.length === 0) return;
    Alert.alert('Xoá đoạn hội thoại?', 'Toàn bộ tin nhắn với trợ lý sẽ bị xoá.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await clearConversation(conversationId);
          const newId = await startNewConversation();
          setConversationId(newId);
          setMessages([]);
        },
      },
    ]);
  };

  const canClear = !sending && messages.length > 0;
  const canSend = !sending && inputText.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <BlurView intensity={30} tint={mode === 'dark' ? 'dark' : 'light'} style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={18} color={themeColors.accentText} />
        </TouchableOpacity>
        <Text style={styles.title}>AI Assistant</Text>
        <TouchableOpacity
          onPress={handleClearConversation}
          disabled={!canClear}
          accessibilityRole="button"
          accessibilityLabel="Xoá đoạn hội thoại"
          style={[styles.headerButton, !canClear && styles.headerButtonDisabled]}
        >
          <Ionicons name="trash-outline" size={18} color={themeColors.accentText} />
        </TouchableOpacity>
      </BlurView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <View style={styles.welcomeWrap}>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIconBadge}>
                <Ionicons name="sparkles-outline" size={28} color={themeColors.accentText} />
              </View>
              <Text style={styles.welcomeTitle}>Tìm sân hoặc tham gia kèo bằng lời nhắn</Text>
              <Text style={styles.welcomeBody}>
                Ví dụ: “Tìm sân cầu lông ở Quận 7 tối nay sau 7h”
              </Text>
            </View>
          </View>
        ) : (
          <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.messagesContent}>
            {messages.map((message) =>
              message.kind === 'pendingAction' ? (
                <PendingActionCard
                  key={message.id}
                  message={message}
                  onConfirm={() => handleConfirmAction('Đồng ý')}
                  onCancel={() => handleConfirmAction('Thôi, hủy giúp mình')}
                />
              ) : (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  onResultPress={handleResultPress}
                  onVenuePress={handleVenuePress}
                />
              ),
            )}
            {sending ? <TypingIndicator /> : null}
          </ScrollView>
        )}

        <View style={styles.inputBarOuter}>
          <VoiceRecorderButton
            onTranscribed={(text) => handleSend(text)}
            onFailed={() =>
              appendMessage({
                id: nextMessageId(),
                role: 'assistant',
                kind: 'error',
                text: 'Không nghe rõ hoặc không có quyền micro. Bạn gõ tin nhắn giúp mình nhé.',
                timestamp: new Date().toISOString(),
              })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Nhắn cho trợ lý..."
            placeholderTextColor={themeColors.searchPlaceholderText}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendText}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSendText}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!canSend}
          >
            <Ionicons name="send" size={16} color={themeColors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.screenBackgroundAlt,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.chromeBorder,
      backgroundColor: c.glassBarBg,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.glassRingBorder,
      backgroundColor: c.glassButtonBg,
    },
    headerButtonDisabled: {
      opacity: 0.4,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    welcomeWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    welcomeCard: {
      width: '100%',
      alignItems: 'center',
      gap: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      backgroundColor: c.glassCardBg,
      paddingHorizontal: 24,
      paddingVertical: 28,
    },
    welcomeIconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.glassButtonBg,
      borderWidth: 2,
      borderColor: c.glassRingBorder,
    },
    welcomeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'center',
    },
    welcomeBody: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
    },
    messagesContent: {
      paddingVertical: 12,
    },
    inputBarOuter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 12,
      marginVertical: 10,
      padding: 6,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      backgroundColor: c.searchOuterBg,
    },
    input: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.divider,
      backgroundColor: c.searchInnerBg,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: c.textPrimary,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
  });
}
