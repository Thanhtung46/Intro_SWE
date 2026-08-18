import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseVenueSuggestionsQuery } from '../../../src/domains/matchmaking/dto/venue-suggestions.dto.js';

describe('venueSuggestionsQuerySchema', () => {
  it('requires location', () => {
    assert.throws(() => parseVenueSuggestionsQuery({}), /location/);
  });

  it('accepts location with optional sport', () => {
    const result = parseVenueSuggestionsQuery({
      location: 'san abc',
      sport: 'FOOTBALL',
    });
    assert.equal(result.location, 'san abc');
    assert.equal(result.sport, 'FOOTBALL');
    assert.equal(result.limit, 10);
  });

  it('rejects invalid sport', () => {
    assert.throws(
      () =>
        parseVenueSuggestionsQuery({
          location: 'q7',
          sport: 'TENNIS',
        }),
      /sport/,
    );
  });
});
