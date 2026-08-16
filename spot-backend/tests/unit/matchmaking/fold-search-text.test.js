import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { foldSearchText } from '../../../src/shared/utils/foldSearchText.js';

describe('foldSearchText', () => {
  it('strips Vietnamese diacritics and đ', () => {
    assert.equal(foldSearchText('Sân ABC'), 'san abc');
    assert.equal(foldSearchText('Đường Nguyễn'), 'duong nguyen');
  });

  it('collapses spaces and lowercases', () => {
    assert.equal(foldSearchText('  Saturday   7v7  '), 'saturday 7v7');
  });
});
