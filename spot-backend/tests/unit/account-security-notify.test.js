import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  maskEmail,
  maskPhone,
  ACCOUNT_SECURITY_ACTIONS,
} from '../../src/domains/notification/service/account-security-notify.js';

describe('maskEmail', () => {
  it('masks local part and keeps domain', () => {
    assert.equal(maskEmail('player@example.com'), 'p***@example.com');
  });

  it('normalizes case', () => {
    assert.equal(maskEmail('Player@Example.COM'), 'p***@example.com');
  });

  it('returns fallback for invalid input', () => {
    assert.equal(maskEmail(''), '***');
    assert.equal(maskEmail(null), '***');
  });
});

describe('maskPhone', () => {
  it('shows last four digits', () => {
    assert.equal(maskPhone('0901234567'), '***4567');
  });

  it('strips non-digits before masking', () => {
    assert.equal(maskPhone('+84 901-234-567'), '***4567');
  });

  it('returns fallback for short numbers', () => {
    assert.equal(maskPhone('123'), '***');
  });
});

describe('ACCOUNT_SECURITY_ACTIONS', () => {
  it('defines expected action keys', () => {
    assert.equal(ACCOUNT_SECURITY_ACTIONS.EMAIL_CHANGED, 'ACCOUNT_EMAIL_CHANGED');
    assert.equal(ACCOUNT_SECURITY_ACTIONS.PHONE_CHANGED, 'ACCOUNT_PHONE_CHANGED');
    assert.equal(
      ACCOUNT_SECURITY_ACTIONS.PASSWORD_CHANGED,
      'ACCOUNT_PASSWORD_CHANGED',
    );
    assert.equal(ACCOUNT_SECURITY_ACTIONS.PASSWORD_RESET, 'ACCOUNT_PASSWORD_RESET');
  });
});
