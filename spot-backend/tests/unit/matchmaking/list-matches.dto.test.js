import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listMatchesQuerySchema } from '../../../src/domains/matchmaking/dto/list-matches.dto.js';
import { computeYourShare } from '../../../src/shared/constants/matchmaking.js';

describe('listMatchesQuerySchema', () => {
  it('defaults limit and offset', () => {
    const parsed = listMatchesQuerySchema.parse({});
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.offset, 0);
  });

  it('accepts sport + skill + date', () => {
    const parsed = listMatchesQuerySchema.parse({
      sport: 'FOOTBALL',
      skill: 'REC_BASIC',
      date: '2026-08-22',
      priceMax: '80000',
      location: 'Q7',
    });
    assert.deepEqual(parsed.skill, ['REC_BASIC']);
    assert.equal(parsed.priceMax, 80000);
  });

  it('accepts priceMin and priceMax range', () => {
    const parsed = listMatchesQuerySchema.parse({
      priceMin: '20000',
      priceMax: '150000',
    });
    assert.equal(parsed.priceMin, 20000);
    assert.equal(parsed.priceMax, 150000);
  });

  it('rejects priceMin greater than priceMax', () => {
    const result = listMatchesQuerySchema.safeParse({
      priceMin: '150000',
      priceMax: '20000',
    });
    assert.equal(result.success, false);
  });

  it('accepts date with timeFrom and timeTo', () => {
    const parsed = listMatchesQuerySchema.parse({
      date: '2026-08-22',
      timeFrom: '19:00',
      timeTo: '21:00',
    });
    assert.equal(parsed.timeFrom, '19:00:00');
    assert.equal(parsed.timeTo, '21:00:00');
  });

  it('rejects timeTo not after timeFrom', () => {
    const result = listMatchesQuerySchema.safeParse({
      timeFrom: '21:00',
      timeTo: '19:00',
    });
    assert.equal(result.success, false);
  });

  it('accepts multiple skills from repeated query keys', () => {
    const parsed = listMatchesQuerySchema.parse({
      sport: 'FOOTBALL',
      skill: ['REC_BASIC', 'SEMI_PRO'],
    });
    assert.deepEqual(parsed.skill, ['REC_BASIC', 'SEMI_PRO']);
  });

  it('accepts comma-separated skills', () => {
    const parsed = listMatchesQuerySchema.parse({
      sport: 'FOOTBALL',
      skill: 'REC_BASIC,ELITE',
    });
    assert.deepEqual(parsed.skill, ['REC_BASIC', 'ELITE']);
  });

  it('accepts favorited=true from query string', () => {
    const parsed = listMatchesQuerySchema.parse({ favorited: 'true' });
    assert.equal(parsed.favorited, true);
  });

  it('omits favorited when blank', () => {
    const parsed = listMatchesQuerySchema.parse({});
    assert.equal(parsed.favorited, undefined);
  });

  it('rejects skill without sport', () => {
    const result = listMatchesQuerySchema.safeParse({ skill: 'BEGINNER' });
    assert.equal(result.success, false);
  });

  it('rejects ELITE skill when sport is badminton', () => {
    const result = listMatchesQuerySchema.safeParse({
      sport: 'BADMINTON',
      skill: 'ELITE',
    });
    assert.equal(result.success, false);
  });

  it('accepts distance trio', () => {
    const parsed = listMatchesQuerySchema.parse({
      latitude: '10.729',
      longitude: '106.721',
      radiusKm: '5',
    });
    assert.equal(parsed.latitude, 10.729);
    assert.equal(parsed.longitude, 106.721);
    assert.equal(parsed.radiusKm, 5);
  });

  it('rejects radius without coordinates', () => {
    const result = listMatchesQuerySchema.safeParse({ radiusKm: '10' });
    assert.equal(result.success, false);
  });

  it('rejects radiusKm above 20', () => {
    const result = listMatchesQuerySchema.safeParse({
      latitude: '10.7',
      longitude: '106.7',
      radiusKm: '21',
    });
    assert.equal(result.success, false);
  });

  it('rejects location together with distance', () => {
    const result = listMatchesQuerySchema.safeParse({
      location: 'Q7',
      latitude: '10.729',
      longitude: '106.721',
      radiusKm: '10',
    });
    assert.equal(result.success, false);
  });

  it('accepts hostUserId', () => {
    const parsed = listMatchesQuerySchema.parse({ hostUserId: '12' });
    assert.equal(parsed.hostUserId, 12);
  });

  it('rejects hostUserId below 1', () => {
    const result = listMatchesQuerySchema.safeParse({ hostUserId: '0' });
    assert.equal(result.success, false);
  });

  it('rejects hostUserId above Postgres INTEGER max', () => {
    const result = listMatchesQuerySchema.safeParse({
      hostUserId: '2147483648',
    });
    assert.equal(result.success, false);
  });

  it('accepts province and city', () => {
    const parsed = listMatchesQuerySchema.parse({
      province: '79',
      city: '778',
    });
    assert.equal(parsed.province, '79');
    assert.equal(parsed.city, '778');
  });

  it('rejects city without province', () => {
    const result = listMatchesQuerySchema.safeParse({ city: '778' });
    assert.equal(result.success, false);
  });
});

describe('computeYourShare', () => {
  it('maps female to priceMin and male to priceMax', () => {
    const range = {
      feeType: 'GENDER_RANGE',
      priceMin: 50000,
      priceMax: 80000,
    };
    assert.equal(computeYourShare({ ...range, gender: 'female' }), 50000);
    assert.equal(computeYourShare({ ...range, gender: 'male' }), 80000);
  });

  it('splits priceMin by filledCount', () => {
    assert.equal(
      computeYourShare({
        feeType: 'SPLIT_EVENLY',
        priceMin: 1400000,
        filledCount: 1,
      }),
      1400000,
    );
    assert.equal(
      computeYourShare({
        feeType: 'SPLIT_EVENLY',
        priceMin: 1400000,
        filledCount: 14,
      }),
      100000,
    );
    assert.equal(
      computeYourShare({
        feeType: 'SPLIT_EVENLY',
        priceMin: 100000,
        filledCount: 3,
      }),
      33334,
    );
  });
});
