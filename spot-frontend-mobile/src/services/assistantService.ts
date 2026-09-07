import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';
import apiClient from './apiClient';

export interface MatchResult {
  matchId: number;
  title: string;
  venueName: string;
  startsAt: string;
  spotsLeft: number;
}

export interface VenueResult {
  venueId: number;
  venueName: string;
  address: string;
  priceFromPerHour: number | null;
}

export interface BookingHandoff {
  venueId: number;
  venueName: string;
  date: string | null;
  timeFrom: string | null;
}

export interface PendingActionSummary {
  venueName?: string;
  startsAt?: string;
  price?: number;
  spotsLeft?: number;
}

export interface PendingAction {
  actionId: string;
  type: 'JOIN_MATCH' | 'HOST_MATCH';
  matchId: number | null;
  summary: PendingActionSummary;
  state: 'awaiting_confirmation' | 'finalized' | 'expired' | 'cancelled';
  expiresAt: string;
}

export interface AssistantReply {
  text: string;
  transcript: string | null;
  results: MatchResult[] | null;
  venueResults: VenueResult[] | null;
  pendingAction: PendingAction | null;
  clarifyingQuestion: string | null;
  bookingHandoff: BookingHandoff | null;
}

export interface ConflictAlternative {
  matchId: number;
  title: string;
  startsAt: string;
}

export type SendMessageResult =
  | { outcome: 'ok'; reply: AssistantReply }
  | { outcome: 'unavailable'; message: string }
  | { outcome: 'conflict'; message: string; alternative: ConflictAlternative | null };

export interface HistoryMessage {
  role: 'player' | 'assistant';
  inputMode?: 'text' | 'voice' | null;
  text: string;
  timestamp: string;
}

const CONVERSATION_ID_KEY = 'spot:assistant_conversation_id';
const UNAVAILABLE_MESSAGE = 'Assistant is temporarily unavailable. Please use the search filters instead.';

/**
 * Only the current conversation id is persisted on-device — actual message
 * content always comes from the server (research.md decision 6), so an
 * expired/unknown id just resolves to empty history on the next fetch.
 */
export async function getOrCreateConversationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(CONVERSATION_ID_KEY);
  if (existing) {
    return existing;
  }
  return startNewConversation();
}

/** Persists a fresh conversation id, replacing whatever was stored before —
 * used when the player clears the chat, so the next message starts a new
 * server-side conversation rather than reusing the just-cleared one. */
export async function startNewConversation(): Promise<string> {
  const generated = generateUuid();
  await AsyncStorage.setItem(CONVERSATION_ID_KEY, generated);
  return generated;
}

function generateUuid(): string {
  // Non-cryptographic v4-shaped id — sufficient for a client-local
  // conversation key that is never used for anything security-sensitive.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type MessagePayload =
  | { inputMode: 'text'; text: string }
  | { inputMode: 'voice'; audio: string; audioMimeType: string };

export async function sendMessage(
  conversationId: string,
  payload: MessagePayload,
): Promise<SendMessageResult> {
  try {
    const res = await apiClient.post<{ reply: AssistantReply }>(
      `/assistant/conversations/${conversationId}/messages`,
      payload,
    );
    return { outcome: 'ok', reply: res.data.reply };
  } catch (err) {
    const error = err as AxiosError<{ error?: string; alternative?: ConflictAlternative }>;
    if (error.response?.status === 409) {
      return {
        outcome: 'conflict',
        message: error.response.data?.error || 'That kèo is no longer available.',
        alternative: error.response.data?.alternative || null,
      };
    }
    return {
      outcome: 'unavailable',
      message: error.response?.data?.error || UNAVAILABLE_MESSAGE,
    };
  }
}

export async function getHistory(conversationId: string): Promise<HistoryMessage[]> {
  try {
    const res = await apiClient.get<{ messages: HistoryMessage[] }>(
      `/assistant/conversations/${conversationId}`,
    );
    return res.data.messages;
  } catch {
    return [];
  }
}

export async function clearConversation(conversationId: string): Promise<void> {
  try {
    await apiClient.delete(`/assistant/conversations/${conversationId}`);
  } catch {
    // Best-effort — a failed clear just means old history reappears next
    // time, not a broken state.
  }
}
