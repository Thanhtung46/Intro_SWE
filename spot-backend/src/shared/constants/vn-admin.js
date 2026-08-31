import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const payload = JSON.parse(
  readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'vn-admin.json'),
    'utf8',
  ),
);

const provinceByCode = new Map(
  payload.provinces.map((province) => [province.code, province]),
);
const cityKey = (provinceCode, cityCode) => `${provinceCode}:${cityCode}`;
const cityByKey = new Map();
for (const province of payload.provinces) {
  for (const city of province.cities) {
    cityByKey.set(cityKey(province.code, city.code), city);
  }
}

/** Pre-2025 map: 63 tỉnh/TP + quận/huyện/thị xã/TP thuộc tỉnh. No Geoapify. */
export function getVnAdminTree() {
  return {
    map: payload.map,
    provinces: payload.provinces,
  };
}

export function isVnProvince(code) {
  return provinceByCode.has(String(code || ''));
}

export function isVnCityInProvince(provinceCode, cityCode) {
  return cityByKey.has(cityKey(String(provinceCode || ''), String(cityCode || '')));
}

export function vnProvinceName(code) {
  return provinceByCode.get(String(code || ''))?.name ?? null;
}

export function vnCityName(provinceCode, cityCode) {
  return cityByKey.get(cityKey(String(provinceCode || ''), String(cityCode || '')))
    ?.name ?? null;
}
