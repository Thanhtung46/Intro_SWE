import config from '../../../shared/config/env.js';

const UNAVAILABLE_MESSAGE = 'Recommendations are temporarily unavailable.';
const REQUEST_TIMEOUT_MS = 3_000;

function baseUrl() {
  return config.recommendation.serviceUrl.replace(/\/$/, '');
}

/**
 * Forwards GET /recommendations to spot-ai-services/recommendation.
 * `userId` is always the server-derived, authenticated caller's own id
 * (research.md decision 2 under specs/004-ai-features-frontend-integration/)
 * — never accepted from `query`. Query params (sport/limit/latitude/
 * longitude/radiusKm) are passed through unchanged so the AI service's own
 * validation (e.g. missing `sport` -> 400) is relayed as-is rather than
 * duplicated here.
 */
export async function getRecommendations(userId, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  // Set last so a `userId` accidentally present in `query` can never win —
  // the authenticated caller's own id is the only one that's ever sent.
  params.set('userId', String(userId));

  try {
    const response = await fetch(`${baseUrl()}/recommendations?${params.toString()}`, {
      headers: { 'X-Internal-Service-Key': config.recommendation.internalServiceKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status >= 500) {
      return { status: 503, body: { error: UNAVAILABLE_MESSAGE } };
    }
    return { status: response.status, body: data };
  } catch {
    return { status: 503, body: { error: UNAVAILABLE_MESSAGE } };
  }
}
