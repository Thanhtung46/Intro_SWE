import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ZodError } from 'zod';
import {
  createVenueSchema,
  createFieldSchema,
  patchFieldSchema,
} from '../../../src/domains/owner/dto/facility.dto.js';
import {
  parseRevenuePeriodDto,
  parseRevenueTimeseriesDto,
} from '../../../src/domains/owner/dto/revenue-query.dto.js';
import { listOwnerReviewsSchema } from '../../../src/domains/owner/dto/reviews.dto.js';

describe('createVenueSchema', () => {
  it('accepts a valid venue payload', () => {
    const parsed = createVenueSchema.parse({
      name: 'San ABC',
      address: '123 Nguyen Van Linh',
      openingHours: '08:00',
      closingHours: '22:00',
    });
    assert.equal(parsed.name, 'San ABC');
  });
});

describe('createFieldSchema', () => {
  it('accepts pricing fields', () => {
    const parsed = createFieldSchema.parse({
      name: 'Pitch A',
      sportType: 'Football',
      pricePerHour: 300000,
      peakPricePerHour: 400000,
      offPeakPricePerHour: 250000,
    });
    assert.equal(parsed.peakPricePerHour, 400000);
  });
});

describe('patchFieldSchema', () => {
  it('accepts maintenance status update', () => {
    const parsed = patchFieldSchema.parse({
      status: 'MAINTENANCE',
      maintenanceNote: 'Resurfacing court',
    });
    assert.equal(parsed.status, 'MAINTENANCE');
  });

  it('rejects empty patch', () => {
    assert.throws(() => patchFieldSchema.parse({}), ZodError);
  });
});

describe('revenue query DTOs', () => {
  it('parses summary period', () => {
    const parsed = parseRevenuePeriodDto({
      from: '2026-01-01',
      to: '2026-01-31',
      sport: 'Football',
    });
    assert.equal(parsed.from, '2026-01-01');
  });

  it('rejects inverted date range', () => {
    assert.throws(
      () =>
        parseRevenuePeriodDto({
          from: '2026-02-01',
          to: '2026-01-01',
        }),
      ZodError,
    );
  });

  it('defaults timeseries granularity to month', () => {
    const parsed = parseRevenueTimeseriesDto({
      from: '2026-01-01',
      to: '2026-03-31',
    });
    assert.equal(parsed.granularity, 'month');
  });
});

describe('listOwnerReviewsSchema', () => {
  it('coerces hasReply boolean', () => {
    const parsed = listOwnerReviewsSchema.parse({ hasReply: 'false' });
    assert.equal(parsed.hasReply, false);
  });
});
