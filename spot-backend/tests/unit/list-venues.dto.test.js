import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listVenuesQuerySchema } from '../../src/domains/venue/dto/list-venues.dto.js';

describe('listVenuesQuerySchema', () => {
  it('accepts sport=football', () => {
    const parsed = listVenuesQuerySchema.parse({ sport: 'football' });
    assert.equal(parsed.sport, 'football');
    assert.equal(parsed.lat, undefined);
    assert.equal(parsed.radiusKm, undefined);
  });

  it('is case-insensitive on sport', () => {
    const parsed = listVenuesQuerySchema.parse({ sport: 'BADMINTON' });
    assert.equal(parsed.sport, 'BADMINTON');
  });

  it('rejects missing sport', () => {
    const result = listVenuesQuerySchema.safeParse({});
    assert.equal(result.success, false);
  });

  it('rejects unsupported sport value', () => {
    const result = listVenuesQuerySchema.safeParse({ sport: 'tennis' });
    assert.equal(result.success, false);
  });

  it('accepts valid lat+long+radiusKm and defaults radiusKm to 20 if omitted', () => {
    const parsed = listVenuesQuerySchema.parse({
      sport: 'football',
      lat: '10.7769',
      long: '106.7009',
    });
    assert.equal(parsed.lat, 10.7769);
    assert.equal(parsed.long, 106.7009);
    assert.equal(parsed.radiusKm, 20);
  });

  it('rejects lat given without long', () => {
    const result = listVenuesQuerySchema.safeParse({
      sport: 'football',
      lat: '10.7769',
    });
    assert.equal(result.success, false);
  });

  it('rejects out-of-range lat', () => {
    const result = listVenuesQuerySchema.safeParse({
      sport: 'football',
      lat: '95',
      long: '106.7009',
    });
    assert.equal(result.success, false);
  });

  it('rejects out-of-range long', () => {
    const result = listVenuesQuerySchema.safeParse({
      sport: 'football',
      lat: '10.7769',
      long: '190',
    });
    assert.equal(result.success, false);
  });
});
