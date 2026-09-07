import React, { useEffect, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { venueDetailRoute } from '@/constants/routes';
import { comingSoon } from '@/utils/comingSoon';
import ChatMessageBubble from '@/components/assistant/ChatMessageBubble';
import PendingActionCard from '@/components/assistant/PendingActionCard';
import TypingIndicator from '@/components/assistant/TypingIndicator';
import VoiceRecorderButton from '@/components/assistant/VoiceRecorderButton';
import {
  AssistantReply,
  ConflictAlternative,
  MatchResult,
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
    // No match-detail screen exists in this app yet (only /venue/[id]) —
    // matches the "coming soon" convention already used elsewhere for
    // not-yet-built destinations (e.g. Home's "Find Match").
    comingSoon(result.title);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <Text style={styles.title}>AI Assistant</Text>
        <TouchableOpacity
          onPress={handleClearConversation}
          disabled={sending || messages.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Xoá đoạn hội thoại"
          style={styles.backButton}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={messages.length === 0 ? colors.cardBorder : colors.headingText}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <View style={styles.welcomeWrap}>
            <Ionicons name="sparkles-outline" size={32} color={colors.primaryDark} />
            <Text style={styles.welcomeTitle}>Tìm sân hoặc tham gia kèo bằng lời nhắn</Text>
            <Text style={styles.welcomeBody}>
              Ví dụ: “Tìm sân cầu lông ở Quận 7 tối nay sau 7h”
            </Text>
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
                <ChatMessageBubble key={message.id} message={message} onResultPress={handleResultPress} />
              ),
            )}
            {sending ? <TypingIndicator /> : null}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
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
            placeholderTextColor={colors.bodyText}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendText}
            editable={!sending}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendText}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={sending || !inputText.trim()}
          >
            <Ionicons name="send" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headingText,
  },
  welcomeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headingText,
    textAlign: 'center',
  },
  welcomeBody: {
    fontSize: 13,
    color: colors.bodyText,
    textAlign: 'center',
  },
  messagesContent: {
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.glassBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.headingText,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
});
