import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isVnCityInProvince,
  vnCityName,
  vnProvinceName,
} from '../../../src/shared/constants/vn-admin.js';

describe('vn-admin pre-2025 map', () => {
  it('maps HCM Quận 7', () => {
    assert.equal(isVnCityInProvince('79', '778'), true);
    assert.equal(vnProvinceName('79'), 'Thành phố Hồ Chí Minh');
    assert.equal(vnCityName('79', '778'), 'Quận 7');
  });

  it('rejects a city from another province', () => {
    assert.equal(isVnCityInProvince('79', '001'), false);
  });
});
