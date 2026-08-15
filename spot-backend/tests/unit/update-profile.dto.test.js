import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { updateProfileSchema } from '../../src/domains/users/dto/update-profile.dto.js';

describe('updateProfileSchema', () => {
  it('accepts fullName only', () => {
    const parsed = updateProfileSchema.parse({ fullName: 'Nguyen Van A' });
    assert.equal(parsed.fullName, 'Nguyen Van A');
  });

  it('accepts gender only', () => {
    const parsed = updateProfileSchema.parse({ gender: 'female' });
    assert.equal(parsed.gender, 'female');
  });

  it('accepts fullName and gender', () => {
    const parsed = updateProfileSchema.parse({
      fullName: 'Nguyen Van A',
      gender: 'other',
    });
    assert.equal(parsed.fullName, 'Nguyen Van A');
    assert.equal(parsed.gender, 'other');
  });

  it('accepts prefs fields', () => {
    const parsed = updateProfileSchema.parse({
      language: 'vi',
      appearance: 'dark',
      pushNotificationsEnabled: false,
      locationServicesEnabled: true,
      avatarUrl: 'https://cdn.example.com/a.png',
    });
    assert.equal(parsed.language, 'vi');
    assert.equal(parsed.appearance, 'dark');
    assert.equal(parsed.pushNotificationsEnabled, false);
    assert.equal(parsed.avatarUrl, 'https://cdn.example.com/a.png');
  });

  it('accepts null avatarUrl to clear', () => {
    const parsed = updateProfileSchema.parse({ avatarUrl: null });
    assert.equal(parsed.avatarUrl, null);
  });

  it('rejects empty body', () => {
    const result = updateProfileSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('rejects email field (strict)', () => {
    const result = updateProfileSchema.safeParse({
      fullName: 'A',
      email: 'a@example.com',
    });
    assert.equal(result.success, false);
  });

  it('rejects invalid gender', () => {
    const result = updateProfileSchema.safeParse({ gender: 'unknown' });
    assert.equal(result.success, false);
  });

  it('rejects invalid language', () => {
    const result = updateProfileSchema.safeParse({ language: 'fr' });
    assert.equal(result.success, false);
  });

  it('rejects non-http avatarUrl', () => {
    const result = updateProfileSchema.safeParse({
      avatarUrl: 'ftp://cdn.example.com/a.png',
    });
    assert.equal(result.success, false);
  });
});
