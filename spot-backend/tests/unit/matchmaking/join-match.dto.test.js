import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { joinMatchSchema, parseJoinMatchDto } from '../../../src/domains/matchmaking/dto/join-match.dto.js';

describe('joinMatchSchema', () => {
  it('defaults guests to an empty list', () => {
    const parsed = joinMatchSchema.parse({});
    assert.deepEqual(parsed.guests, []);
  });

  it('accepts a message and guests', () => {
    const parsed = joinMatchSchema.parse({
      message: 'Can I bring a friend?',
      guests: [
        { name: 'Minh', skill: 'REC_BASIC', gender: 'male', phoneNumber: '0901111111' },
        { name: 'Lan', skill: 'LEARNING', gender: 'female', phoneNumber: '0902222222' },
      ],
    });
    assert.equal(parsed.guests.length, 2);
    assert.equal(parsed.guests[0].name, 'Minh');
  });

  it('rejects guest gender other than male/female', () => {
    const result = joinMatchSchema.safeParse({
      guests: [{ name: 'Minh', skill: 'REC_BASIC', gender: 'other', phoneNumber: '0901111111' }],
    });
    assert.equal(result.success, false);
  });

  it('rejects more than 10 guests', () => {
    const guests = Array.from({ length: 11 }, (_, index) => ({
      name: `Guest ${index}`,
      skill: 'REC_BASIC',
      gender: 'male',
      phoneNumber: '0901111111',
    }));
    const result = joinMatchSchema.safeParse({ guests });
    assert.equal(result.success, false);
  });

  it('rejects a guest missing name', () => {
    const result = joinMatchSchema.safeParse({
      guests: [{ skill: 'REC_BASIC', gender: 'male', phoneNumber: '0901111111' }],
    });
    assert.equal(result.success, false);
  });
});

describe('parseJoinMatchDto', () => {
  it('rejects guest skill that does not belong to the match sport', () => {
    assert.throws(
      () =>
        parseJoinMatchDto(
          {
            guests: [{ name: 'Minh', skill: 'BEGINNER', gender: 'male', phoneNumber: '0901111111' }],
          },
          { sport: 'FOOTBALL' },
        ),
      { name: 'ZodError' },
    );
  });

  it('accepts football guest skills on a football match', () => {
    const parsed = parseJoinMatchDto(
      {
        guests: [{ name: 'Minh', skill: 'REC_BASIC', gender: 'male', phoneNumber: '0901111111' }],
      },
      { sport: 'FOOTBALL' },
    );
    assert.equal(parsed.guests[0].skill, 'REC_BASIC');
  });

  it('rejects a guest without phoneNumber', () => {
    const result = joinMatchSchema.safeParse({
      guests: [{ name: 'Minh', skill: 'REC_BASIC', gender: 'male' }],
    });
    assert.equal(result.success, false);
  });
});
