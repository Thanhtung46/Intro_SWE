import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMatchSchema } from '../../../src/domains/matchmaking/dto/create-match.dto.js';

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

function footballPayload(overrides = {}) {
  return {
    sport: 'FOOTBALL',
    format: 'SEVEN_A_SIDE',
    title: 'Saturday 7v7',
    venueName: 'San ABC',
    venueAddress: '123 Nguyen Van Linh, Q7, TP.HCM',
    startsAt: hoursFromNow(24),
    endsAt: hoursFromNow(26),
    maxPlayers: 14,
    skillMin: 'REC_BASIC',
    skillMax: 'SEMI_PRO',
    feeType: 'SPLIT_EVENLY',
    priceMin: 1400000,
    joinMode: 'APPROVAL',
    courtCount: 1,
    courts: [{ name: '1' }],
    ...overrides,
  };
}

describe('createMatchSchema', () => {
  it('accepts football 7v7 split evenly', () => {
    const parsed = createMatchSchema.parse(footballPayload());
    assert.equal(parsed.format, 'SEVEN_A_SIDE');
    assert.equal(parsed.maxPlayers, 14);
    assert.equal(parsed.feeType, 'SPLIT_EVENLY');
  });

  it('accepts badminton doubles with gender-range fee', () => {
    const parsed = createMatchSchema.parse({
      sport: 'BADMINTON',
      format: 'DOUBLES',
      title: 'Evening doubles',
      venueName: 'Cau long Q3',
      venueAddress: '12 Cach Mang Thang 8, Q3, TP.HCM',
      startsAt: hoursFromNow(12),
      endsAt: hoursFromNow(14),
      maxPlayers: 8,
      allLevels: true,
      feeType: 'GENDER_RANGE',
      priceMin: 50000,
      priceMax: 80000,
      joinMode: 'AUTO',
      courtCount: 2,
      courts: [{ name: 'Court 1' }, { name: 'Court 2' }],
    });
    assert.equal(parsed.sport, 'BADMINTON');
    assert.equal(parsed.courts.length, 2);
  });

  it('rejects football format on badminton', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({ sport: 'BADMINTON', format: 'SEVEN_A_SIDE' }),
    );
    assert.equal(result.success, false);
  });

  it('rejects badminton skill on football match', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({ skillMin: 'BEGINNER', skillMax: 'FAIR' }),
    );
    assert.equal(result.success, false);
  });

  it('rejects missing maxPlayers', () => {
    const payload = footballPayload();
    delete payload.maxPlayers;
    const result = createMatchSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  it('rejects FREE fee type', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({ feeType: 'FREE' }),
    );
    assert.equal(result.success, false);
  });

  it('rejects GENDER_RANGE without prices', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({ feeType: 'GENDER_RANGE' }),
    );
    assert.equal(result.success, false);
  });

  it('accepts SPLIT_EVENLY with priceMin as total', () => {
    const parsed = createMatchSchema.parse(
      footballPayload({ feeType: 'SPLIT_EVENLY', priceMin: 1400000 }),
    );
    assert.equal(parsed.feeType, 'SPLIT_EVENLY');
    assert.equal(parsed.priceMin, 1400000);
  });

  it('rejects SPLIT_EVENLY without priceMin', () => {
    const payload = footballPayload({ feeType: 'SPLIT_EVENLY' });
    delete payload.priceMin;
    const result = createMatchSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  it('rejects SPLIT_EVENLY with priceMax', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({
        feeType: 'SPLIT_EVENLY',
        priceMin: 1400000,
        priceMax: 80000,
      }),
    );
    assert.equal(result.success, false);
  });

  it('rejects courts length mismatch', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({ courtCount: 2, courts: [{ name: '1' }] }),
    );
    assert.equal(result.success, false);
  });

  it('rejects missing courts', () => {
    const payload = footballPayload();
    delete payload.courts;
    delete payload.courtCount;
    const result = createMatchSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  it('rejects blank court name', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({ courts: [{ name: '   ' }] }),
    );
    assert.equal(result.success, false);
  });

  it('rejects duplicate court names on one match', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({
        courtCount: 2,
        courts: [{ name: '1' }, { name: '1' }],
      }),
    );
    assert.equal(result.success, false);
  });

  it('rejects duration shorter than 1 hour', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({
        startsAt: hoursFromNow(24),
        endsAt: hoursFromNow(24.5),
      }),
    );
    assert.equal(result.success, false);
  });

  it('accepts duration longer than 4 hours', () => {
    const parsed = createMatchSchema.parse(
      footballPayload({
        startsAt: hoursFromNow(24),
        endsAt: hoursFromNow(29),
      }),
    );
    assert.ok(parsed.endsAt > parsed.startsAt);
  });

  it('rejects missing venueAddress', () => {
    const payload = footballPayload();
    delete payload.venueAddress;
    const result = createMatchSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  it('rejects latitude without longitude', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({ latitude: 10.729 }),
    );
    assert.equal(result.success, false);
  });

  it('accepts optional map coordinates', () => {
    const parsed = createMatchSchema.parse(
      footballPayload({ latitude: 10.729, longitude: 106.721 }),
    );
    assert.equal(parsed.latitude, 10.729);
    assert.equal(parsed.longitude, 106.721);
  });

  it('accepts https coverUrl', () => {
    const parsed = createMatchSchema.parse(
      footballPayload({ coverUrl: 'https://cdn.example.com/cover.jpg' }),
    );
    assert.equal(parsed.coverUrl, 'https://cdn.example.com/cover.jpg');
  });

  it('rejects non-http coverUrl', () => {
    const result = createMatchSchema.safeParse(
      footballPayload({ coverUrl: 'ftp://files.example.com/cover.jpg' }),
    );
    assert.equal(result.success, false);
  });
});
