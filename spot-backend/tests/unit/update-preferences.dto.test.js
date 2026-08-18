import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ZodError } from 'zod';
import { updatePreferencesSchema } from '../../src/domains/users/dto/update-preferences.dto.js';

describe('updatePreferencesSchema', () => {
  it('accepts language only', () => {
    const parsed = updatePreferencesSchema.parse({ language: 'vi' });
    assert.equal(parsed.language, 'vi');
  });

  it('accepts all prefs fields', () => {
    const parsed = updatePreferencesSchema.parse({
      language: 'en',
      appearance: 'dark',
      pushNotificationsEnabled: false,
      locationServicesEnabled: true,
    });
    assert.equal(parsed.appearance, 'dark');
    assert.equal(parsed.pushNotificationsEnabled, false);
  });

  it('rejects empty body', () => {
    assert.throws(() => updatePreferencesSchema.parse({}), ZodError);
  });

  it('rejects fullName (strict Settings-only)', () => {
    assert.throws(
      () => updatePreferencesSchema.parse({ fullName: 'X', language: 'vi' }),
      ZodError,
    );
  });

  it('rejects invalid appearance', () => {
    assert.throws(
      () => updatePreferencesSchema.parse({ appearance: 'neon' }),
      ZodError,
    );
  });
});
