import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NOTIFICATION_TYPES } from '../../../src/shared/constants/notification.js';

describe('NOTIFICATION_TYPES', () => {
  it('includes group notification types', () => {
    assert.equal(NOTIFICATION_TYPES.GROUP_JOIN_REQUEST, 'GROUP_JOIN_REQUEST');
    assert.equal(NOTIFICATION_TYPES.GROUP_APPROVED, 'GROUP_APPROVED');
    assert.equal(NOTIFICATION_TYPES.GROUP_REJECTED, 'GROUP_REJECTED');
    assert.equal(NOTIFICATION_TYPES.GROUP_KICKED, 'GROUP_KICKED');
    assert.equal(NOTIFICATION_TYPES.GROUP_ADMIN_TRANSFERRED, 'GROUP_ADMIN_TRANSFERRED');
  });

  it('includes tournament notification types', () => {
    assert.equal(NOTIFICATION_TYPES.TOURNAMENT_JOIN_REQUEST, 'TOURNAMENT_JOIN_REQUEST');
    assert.equal(NOTIFICATION_TYPES.TOURNAMENT_JOIN_APPROVED, 'TOURNAMENT_JOIN_APPROVED');
    assert.equal(NOTIFICATION_TYPES.TOURNAMENT_JOIN_REJECTED, 'TOURNAMENT_JOIN_REJECTED');
    assert.equal(NOTIFICATION_TYPES.TOURNAMENT_CANCELLED, 'TOURNAMENT_CANCELLED');
    assert.equal(NOTIFICATION_TYPES.TOURNAMENT_KICKED, 'TOURNAMENT_KICKED');
    assert.equal(NOTIFICATION_TYPES.TOURNAMENT_UPDATED, 'TOURNAMENT_UPDATED');
  });
});
