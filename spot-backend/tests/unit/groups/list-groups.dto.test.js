import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listGroupsQuerySchema } from '../../../src/domains/groups/dto/list-groups.dto.js';

describe('listGroupsQuerySchema', () => {
  it('accepts sport and location', () => {
    const parsed = listGroupsQuerySchema.parse({
      sport: 'FOOTBALL',
      location: 'unity',
    });
    assert.equal(parsed.sport, 'FOOTBALL');
    assert.equal(parsed.location, 'unity');
  });

  it('rejects location with distance filters', () => {
    assert.throws(() =>
      listGroupsQuerySchema.parse({
        location: 'san abc',
        latitude: 10.7,
        longitude: 106.7,
        radiusKm: 5,
      }),
    );
  });
});
