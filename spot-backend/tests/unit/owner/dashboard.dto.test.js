import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ownerDashboardQuerySchema } from '../../../src/domains/owner/dto/dashboard-query.dto.js';

describe('ownerDashboardQuerySchema', () => {
  it('accepts defaults', () => {
    const parsed = ownerDashboardQuerySchema.parse({});
    assert.equal(parsed.trendsWeeks, 4);
    assert.equal(parsed.recentLimit, 10);
  });

  it('accepts month and venue filter', () => {
    const parsed = ownerDashboardQuerySchema.parse({
      month: '2026-08',
      venueId: '12',
      trendsWeeks: '8',
    });
    assert.equal(parsed.month, '2026-08');
    assert.equal(parsed.venueId, 12);
    assert.equal(parsed.trendsWeeks, 8);
  });
});
