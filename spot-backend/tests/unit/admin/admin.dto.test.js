import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listApprovalsSchema } from '../../../src/domains/admin/dto/list-approvals.dto.js';
import { listUsersSchema, updateUserSchema } from '../../../src/domains/admin/dto/list-users.dto.js';
import { updateSettingsSchema } from '../../../src/domains/admin/dto/update-settings.dto.js';
import { dashboardQuerySchema } from '../../../src/domains/admin/dto/dashboard-query.dto.js';
import { submitVerificationSchema } from '../../../src/domains/users/dto/submit-verification.dto.js';

describe('listApprovalsSchema', () => {
  it('defaults status to PENDING', () => {
    const parsed = listApprovalsSchema.parse({});
    assert.equal(parsed.status, 'PENDING');
    assert.equal(parsed.limit, 20);
  });

  it('accepts role filter', () => {
    const parsed = listApprovalsSchema.parse({ role: 'OWNER', offset: '5' });
    assert.equal(parsed.role, 'OWNER');
    assert.equal(parsed.offset, 5);
  });
});

describe('listUsersSchema', () => {
  it('accepts search query', () => {
    const parsed = listUsersSchema.parse({ q: 'admin@spot.local', status: 'ACTIVE' });
    assert.equal(parsed.q, 'admin@spot.local');
    assert.equal(parsed.status, 'ACTIVE');
  });
});

describe('updateUserSchema', () => {
  it('requires at least one field', () => {
    const result = updateUserSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('accepts suspend status', () => {
    const parsed = updateUserSchema.parse({ status: 'LOCKED' });
    assert.equal(parsed.status, 'LOCKED');
  });
});

describe('updateSettingsSchema', () => {
  it('validates commission range', () => {
    const result = updateSettingsSchema.safeParse({ commissionRatePercent: 150 });
    assert.equal(result.success, false);
  });

  it('accepts payment gateway toggles', () => {
    const parsed = updateSettingsSchema.parse({
      paymentGateways: { momo: { enabled: true } },
    });
    assert.equal(parsed.paymentGateways.momo.enabled, true);
  });
});

describe('dashboardQuerySchema', () => {
  it('defaults registrationDays to 30', () => {
    const parsed = dashboardQuerySchema.parse({});
    assert.equal(parsed.registrationDays, 30);
  });
});

describe('submitVerificationSchema', () => {
  it('accepts owner license URL', () => {
    const parsed = submitVerificationSchema.parse({
      documentUrl: 'https://cdn.example.com/license.pdf',
      requestType: 'OWNER_LICENSE',
    });
    assert.equal(parsed.requestType, 'OWNER_LICENSE');
  });

  it('rejects invalid URL', () => {
    const result = submitVerificationSchema.safeParse({
      documentUrl: 'not-a-url',
      requestType: 'REFEREE_CREDENTIAL',
    });
    assert.equal(result.success, false);
  });
});
