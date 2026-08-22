import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBoardQueryDto,
  parseRegisterVenueDto,
  parseInvitationsQueryDto,
  normalizeCertifiedSportTypes,
} from '../../src/domains/referee/dto/referee.dto.js';
import { parseSubmitVerificationBatchDto } from '../../src/domains/users/dto/submit-verification-batch.dto.js';
import { parseApproveApprovalDto } from '../../src/domains/admin/dto/list-approvals.dto.js';

test('parseBoardQueryDto normalizes sport', () => {
  const q = parseBoardQueryDto({ sport: 'football' });
  assert.equal(q.sport, 'Football');
});

test('parseBoardQueryDto rejects lat without lng', () => {
  assert.throws(() => parseBoardQueryDto({ sport: 'football', lat: 10.7 }));
});

test('parseBoardQueryDto rejects province with distance', () => {
  assert.throws(() =>
    parseBoardQueryDto({
      sport: 'football',
      province: '79',
      lat: 10.7,
      lng: 106.7,
    }),
  );
});

test('parseBoardQueryDto accepts province and city', () => {
  const q = parseBoardQueryDto({ sport: 'football', province: '79', city: '778' });
  assert.equal(q.province, '79');
  assert.equal(q.city, '778');
});

test('parseBoardQueryDto defaults radiusKm when lat/lng provided', () => {
  const q = parseBoardQueryDto({ sport: 'football', lat: 10.7, lng: 106.7 });
  assert.equal(q.radiusKm, 20);
});

test('parseBoardQueryDto accepts favorited and q', () => {
  const q = parseBoardQueryDto({
    sport: 'football',
    favorited: 'true',
    q: 'arena',
  });
  assert.equal(q.favorited, true);
  assert.equal(q.q, 'arena');
});

test('parseRegisterVenueDto accepts badminton', () => {
  const dto = parseRegisterVenueDto({ sportType: 'badminton' });
  assert.equal(dto.sportType, 'Badminton');
});

test('parseInvitationsQueryDto defaults to pending', () => {
  const q = parseInvitationsQueryDto({});
  assert.equal(q.tab, 'pending');
  assert.equal(q.since, '30d');
});

test('normalizeCertifiedSportTypes dedupes', () => {
  const sports = normalizeCertifiedSportTypes(['football', 'Football', 'badminton']);
  assert.deepEqual(sports, ['Football', 'Badminton']);
});

test('parseSubmitVerificationBatchDto requires 3 unique kinds', () => {
  assert.throws(() =>
    parseSubmitVerificationBatchDto({
      documents: [
        { documentKind: 'ID_FRONT', documentUrl: 'https://example.com/a.jpg' },
      ],
    }),
  );
});

test('parseSubmitVerificationBatchDto accepts full bundle', () => {
  const dto = parseSubmitVerificationBatchDto({
    documents: [
      { documentKind: 'ID_FRONT', documentUrl: 'https://example.com/a.jpg' },
      { documentKind: 'ID_BACK', documentUrl: 'https://example.com/b.jpg' },
      { documentKind: 'VFF_LICENSE', documentUrl: 'https://example.com/c.pdf' },
    ],
  });
  assert.equal(dto.documents.length, 3);
});

test('parseApproveApprovalDto accepts certified sports', () => {
  const dto = parseApproveApprovalDto({ certifiedSportTypes: ['football'] });
  assert.deepEqual(dto.certifiedSportTypes, ['football']);
});
