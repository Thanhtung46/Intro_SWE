import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listGroupMineQuerySchema } from '../../../src/domains/groups/dto/list-mine.dto.js';

describe('listGroupMineQuerySchema', () => {
  it('defaults to managed/groups', () => {
    const parsed = listGroupMineQuerySchema.parse({});
    assert.equal(parsed.tab, 'managed');
    assert.equal(parsed.section, 'groups');
  });

  it('accepts joined join-requests', () => {
    const parsed = listGroupMineQuerySchema.parse({
      tab: 'joined',
      section: 'join-requests',
    });
    assert.equal(parsed.section, 'join-requests');
  });

  it('rejects join-requests on managed tab', () => {
    assert.throws(() =>
      listGroupMineQuerySchema.parse({
        tab: 'managed',
        section: 'join-requests',
      }),
    );
  });
});
