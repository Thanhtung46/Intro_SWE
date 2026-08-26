import config from '../../../shared/config/env.js';

const UNAVAILABLE_MESSAGE =
  'Assistant is temporarily unavailable. Please use the search filters instead.';
// A voice turn can call Gemini twice sequentially inside nlp-assistant
// (transcribe, then extract criteria), each with its own
// LLM_TIMEOUT_SECONDS budget (15s) — so the worst case there is ~30s, not
// the ~5-8s typical case. Stay comfortably above that so a slow-but-normal
// response never gets cut off mid-flight.
const REQUEST_TIMEOUT_MS = 35_000;

function baseUrl() {
  return config.assistant.nlpServiceUrl.replace(/\/$/, '');
}

function headers(accessToken, extra = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Service-Key': config.assistant.internalServiceKey,
    'X-Player-Access-Token': accessToken,
    ...extra,
  };
}

/**
 * Forwards a request to nlp-assistant and relays its status/body back.
 * A network failure or timeout talking to nlp-assistant is mapped to the
 * same 503 shape nlp-assistant itself would return on an LLM timeout
 * (contracts/assistant-proxy-api.md), so the client sees one consistent
 * "assistant unavailable" outcome either way.
 */
async function relay(path, { method = 'GET', accessToken, body } = {}) {
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: headers(accessToken),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 204) {
      return { status: 204, body: undefined };
    }

    const data = await response.json().catch(() => ({}));
    return { status: response.status, body: data };
  } catch {
    return {
      status: 503,
      body: { error: UNAVAILABLE_MESSAGE },
    };
  }
}

export async function sendMessage(accessToken, conversationId, payload) {
  return relay(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function getHistory(accessToken, conversationId) {
  return relay(`/conversations/${conversationId}`, {
    method: 'GET',
    accessToken,
  });
}

export async function clearConversation(accessToken, conversationId) {
  return relay(`/conversations/${conversationId}`, {
    method: 'DELETE',
    accessToken,
  });
}
