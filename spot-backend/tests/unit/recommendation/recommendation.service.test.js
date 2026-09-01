import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as recommendationService from '../../../src/domains/recommendation/service/recommendation.service.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetch(status, body) {
  global.fetch = async (url) => ({
    status,
    json: async () => body,
    _url: url,
  });
}

describe('recommendation.service getRecommendations', () => {
  it('sends userId from the passed-in argument, not from query', async () => {
    let capturedUrl;
    global.fetch = async (url) => {
      capturedUrl = url;
      return { status: 200, json: async () => ({ items: [], generatedAt: 'now', fallback: false }) };
    };

    await recommendationService.getRecommendations(42, { sport: 'FOOTBALL', userId: 999 });

    const params = new URL(capturedUrl).searchParams;
    assert.equal(params.get('userId'), '42');
    assert.equal(params.get('sport'), 'FOOTBALL');
  });

  it('passes sport through unchanged and relays a 200 body', async () => {
    mockFetch(200, { items: [{ venueId: 1 }], generatedAt: 'now', fallback: true });

    const result = await recommendationService.getRecommendations(1, { sport: 'BADMINTON' });

    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { items: [{ venueId: 1 }], generatedAt: 'now', fallback: true });
  });

  it('relays a 400 from the AI service (e.g. missing sport) unchanged', async () => {
    mockFetch(400, { error: 'sport must be one of FOOTBALL, BADMINTON' });

    const result = await recommendationService.getRecommendations(1, {});

    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'sport must be one of FOOTBALL, BADMINTON');
  });

  it('maps an upstream 500 to a 503 with a generic unavailable message', async () => {
    mockFetch(500, { error: 'Upstream data error' });

    const result = await recommendationService.getRecommendations(1, { sport: 'FOOTBALL' });

    assert.equal(result.status, 503);
    assert.match(result.body.error, /temporarily unavailable/);
  });

  it('maps a network failure/timeout to a 503, never a fabricated 200', async () => {
    global.fetch = async () => {
      throw new Error('timeout');
    };

    const result = await recommendationService.getRecommendations(1, { sport: 'FOOTBALL' });

    assert.equal(result.status, 503);
    assert.match(result.body.error, /temporarily unavailable/);
  });
});
