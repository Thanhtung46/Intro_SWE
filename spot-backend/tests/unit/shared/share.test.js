import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeYourShare,
  computeRequestShare,
} from '../../../src/shared/constants/matchmaking.js';

describe('computeYourShare', () => {
  it('splits evenly by maxPlayers with ceil', () => {
    assert.equal(
      computeYourShare({
        feeType: 'SPLIT_EVENLY',
        priceMin: 1400000,
        maxPlayers: 14,
      }),
      100000,
    );
    assert.equal(
      computeYourShare({
        feeType: 'SPLIT_EVENLY',
        priceMin: 1400000,
        maxPlayers: 1,
      }),
      1400000,
    );
    assert.equal(
      computeYourShare({
        feeType: 'SPLIT_EVENLY',
        priceMin: 100000,
        maxPlayers: 3,
      }),
      Math.ceil(100000 / 3),
    );
  });

  it('uses gender range min/max', () => {
    assert.equal(
      computeYourShare({
        feeType: 'GENDER_RANGE',
        priceMin: 50000,
        priceMax: 80000,
        gender: 'female',
      }),
      50000,
    );
    assert.equal(
      computeYourShare({
        feeType: 'GENDER_RANGE',
        priceMin: 50000,
        priceMax: 80000,
        gender: 'male',
      }),
      80000,
    );
  });
});

describe('computeRequestShare', () => {
  it('sums joiner plus guests for split evenly by maxPlayers', () => {
    const share = computeRequestShare({
      feeType: 'SPLIT_EVENLY',
      priceMin: 1400000,
      maxPlayers: 14,
      joinerGender: 'male',
      guests: [{ gender: 'female' }, { gender: 'male' }],
    });
    const each = Math.ceil(1400000 / 14);
    assert.equal(share, each * 3);
  });

  it('sums gender-range prices per head', () => {
    const share = computeRequestShare({
      feeType: 'GENDER_RANGE',
      priceMin: 50000,
      priceMax: 80000,
      maxPlayers: 14,
      joinerGender: 'female',
      guests: [{ gender: 'male' }],
    });
    assert.equal(share, 50000 + 80000);
  });
});
