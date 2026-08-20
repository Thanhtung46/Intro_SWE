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
});
