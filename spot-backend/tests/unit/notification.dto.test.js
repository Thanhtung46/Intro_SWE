import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listNotificationsSchema } from '../../src/domains/notification/dto/list.dto.js';
import { notificationIdParamSchema } from '../../src/domains/notification/dto/mark-read.dto.js';
import { seedNotificationSchema } from '../../src/domains/notification/dto/seed.dto.js';

describe('listNotificationsSchema', () => {
  it('applies defaults', () => {
    const parsed = listNotificationsSchema.parse({});
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.unreadOnly, false);
  });

  it('parses unreadOnly from string', () => {
    const parsed = listNotificationsSchema.parse({ unreadOnly: 'true', limit: '10' });
    assert.equal(parsed.unreadOnly, true);
    assert.equal(parsed.limit, 10);
  });

  it('rejects limit over max', () => {
    const result = listNotificationsSchema.safeParse({ limit: 100 });
    assert.equal(result.success, false);
  });
});

describe('notificationIdParamSchema', () => {
  it('accepts numeric id', () => {
    const parsed = notificationIdParamSchema.parse({ id: '12' });
    assert.equal(parsed.id, 12);
  });

  it('rejects non-positive id', () => {
    const result = notificationIdParamSchema.safeParse({ id: 0 });
    assert.equal(result.success, false);
  });
});

describe('seedNotificationSchema', () => {
  it('applies defaults', () => {
    const parsed = seedNotificationSchema.parse({});
    assert.equal(parsed.type, 'SYSTEM');
    assert.equal(parsed.scheduleReminders, false);
  });

  it('accepts booking reminder seed flags', () => {
    const parsed = seedNotificationSchema.parse({
      type: 'BOOKING_CREATED',
      bookingId: 42,
      scheduleReminders: true,
      startAt: '2030-01-01T10:00:00.000Z',
    });
    assert.equal(parsed.bookingId, 42);
    assert.equal(parsed.scheduleReminders, true);
  });
});
