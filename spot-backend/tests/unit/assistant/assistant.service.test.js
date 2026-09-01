import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as assistantService from '../../../src/domains/assistant/service/assistant.service.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetch(status, body) {
  global.fetch = async () => ({
    status,
    json: async () => body,
  });
}

describe('assistant.service sendMessage', () => {
  it('relays a 409 conflict body (including alternative) verbatim', async () => {
    mockFetch(409, {
      error: 'That kèo is no longer available.',
      alternative: { matchId: 202, title: 'B', startsAt: 'u' },
    });

    const result = await assistantService.sendMessage('token', 'conv-1', {
      inputMode: 'text',
      text: 'Đồng ý',
    });

    assert.equal(result.status, 409);
    assert.deepEqual(result.body, {
      error: 'That kèo is no longer available.',
      alternative: { matchId: 202, title: 'B', startsAt: 'u' },
    });
  });

  it('maps a network failure to a 503 unavailable message', async () => {
    global.fetch = async () => {
      throw new Error('network down');
    };

    const result = await assistantService.sendMessage('token', 'conv-1', {
      inputMode: 'text',
      text: 'hi',
    });

    assert.equal(result.status, 503);
    assert.match(result.body.error, /temporarily unavailable/);
  });

  it('relays a 204 for clearConversation without a body', async () => {
    mockFetch(204, undefined);

    const result = await assistantService.clearConversation('token', 'conv-1');

    assert.equal(result.status, 204);
    assert.equal(result.body, undefined);
  });
});
