import { MatchResult, PendingAction } from '@/services/assistantService';

export type ChatMessageKind = 'text' | 'results' | 'clarifying' | 'pendingAction' | 'error';

/**
 * Client-side rendering model for one conversation turn — wraps
 * assistantService's AssistantReply/HistoryMessage shapes with the
 * client-only bookkeeping a chat UI needs (data-model.md Chat Message).
 */
export type ChatMessage = {
  id: string;
  role: 'player' | 'assistant';
  kind: ChatMessageKind;
  text: string;
  payload?: MatchResult[] | PendingAction;
  sendState?: 'sent' | 'sending' | 'failed';
  timestamp: string;
};

let counter = 0;

/** Client-generated id for list keys — not a server id. */
export function nextMessageId(): string {
  counter += 1;
  return `msg-${Date.now()}-${counter}`;
}
