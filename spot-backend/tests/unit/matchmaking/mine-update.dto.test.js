import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listMineQuerySchema } from '../../../src/domains/matchmaking/dto/list-mine.dto.js';
import { updateMatchSchema } from '../../../src/domains/matchmaking/dto/update-match.dto.js';

describe('listMineQuerySchema', () => {
  it('defaults tab to active', () => {
    const parsed = listMineQuerySchema.parse({});
    assert.equal(parsed.tab, 'active');
    assert.equal(parsed.limit, 20);
  });

  it('accepts completed tab', () => {
    const parsed = listMineQuerySchema.parse({ tab: 'completed' });
    assert.equal(parsed.tab, 'completed');
  });

  it('rejects unknown tab', () => {
    const result = listMineQuerySchema.safeParse({ tab: 'pending' });
    assert.equal(result.success, false);
  });
});

describe('updateMatchSchema', () => {
  it('accepts a title-only patch', () => {
    const parsed = updateMatchSchema.parse({ title: 'New title' });
    assert.equal(parsed.title, 'New title');
  });

  it('rejects an empty body', () => {
    const result = updateMatchSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('rejects duplicate court names', () => {
    const result = updateMatchSchema.safeParse({
      courts: [{ name: '1' }, { name: '1' }],
    });
    assert.equal(result.success, false);
  });
});
