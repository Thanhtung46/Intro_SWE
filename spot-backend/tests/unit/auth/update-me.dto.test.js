import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { updateMeSchema } from '../../../src/domains/auth/dto/update-me.dto.js';

describe('updateMeSchema', () => {
  it('accepts both sports', () => {
    const parsed = updateMeSchema.parse({
      skills: {
        badminton: 'BEGINNER',
        football: 'LEARNING',
      },
    });
    assert.equal(parsed.skills.badminton, 'BEGINNER');
    assert.equal(parsed.skills.football, 'LEARNING');
  });

  it('accepts a single sport (other omitted)', () => {
    const parsed = updateMeSchema.parse({
      skills: { badminton: 'FAIR' },
    });
    assert.equal(parsed.skills.badminton, 'FAIR');
    assert.equal(parsed.skills.football, undefined);
  });

  it('accepts null to clear a sport', () => {
    const parsed = updateMeSchema.parse({
      skills: { football: null },
    });
    assert.equal(parsed.skills.football, null);
  });

  it('rejects badminton skill from the football ladder', () => {
    const result = updateMeSchema.safeParse({
      skills: { badminton: 'ELITE' },
    });
    assert.equal(result.success, false);
    const fields = result.error.errors.map((e) => e.path.join('.'));
    assert.ok(fields.includes('skills.badminton'));
  });

  it('rejects football skill from the badminton ladder', () => {
    const result = updateMeSchema.safeParse({
      skills: { football: 'BEGINNER' },
    });
    assert.equal(result.success, false);
  });

  it('rejects empty skills object', () => {
    const result = updateMeSchema.safeParse({ skills: {} });
    assert.equal(result.success, false);
  });

  it('rejects unknown sport keys', () => {
    const result = updateMeSchema.safeParse({
      skills: { tennis: 'BEGINNER' },
    });
    assert.equal(result.success, false);
  });

  it('rejects missing skills', () => {
    const result = updateMeSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('accepts avatarUrl only', () => {
    const parsed = updateMeSchema.parse({
      avatarUrl: 'https://cdn.example.com/a.png',
    });
    assert.equal(parsed.avatarUrl, 'https://cdn.example.com/a.png');
  });

  it('accepts null avatarUrl to clear', () => {
    const parsed = updateMeSchema.parse({ avatarUrl: null });
    assert.equal(parsed.avatarUrl, null);
  });

  it('rejects javascript avatarUrl', () => {
    const result = updateMeSchema.safeParse({
      avatarUrl: 'javascript:alert(1)',
    });
    assert.equal(result.success, false);
  });
});
