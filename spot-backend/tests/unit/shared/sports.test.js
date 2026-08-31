import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPORTS,
  BADMINTON_SKILL_CODES,
  FOOTBALL_SKILL_CODES,
  isSkillForSport,
  rankForSkill,
  emptySkills,
} from '../../../src/shared/constants/sports.js';

describe('sports skill ladders', () => {
  it('has 10 badminton and 6 football codes', () => {
    assert.equal(BADMINTON_SKILL_CODES.length, 10);
    assert.equal(FOOTBALL_SKILL_CODES.length, 6);
  });

  it('scopes SEMI_PRO to both sports', () => {
    assert.equal(isSkillForSport(SPORTS.BADMINTON, 'SEMI_PRO'), true);
    assert.equal(isSkillForSport(SPORTS.FOOTBALL, 'SEMI_PRO'), true);
    assert.equal(rankForSkill(SPORTS.BADMINTON, 'SEMI_PRO'), 9);
    assert.equal(rankForSkill(SPORTS.FOOTBALL, 'SEMI_PRO'), 4);
  });

  it('rejects ELITE on badminton', () => {
    assert.equal(isSkillForSport(SPORTS.BADMINTON, 'ELITE'), false);
    assert.equal(isSkillForSport(SPORTS.FOOTBALL, 'ELITE'), true);
  });

  it('returns empty skills with nulls', () => {
    assert.deepEqual(emptySkills(), { badminton: null, football: null });
  });
});
