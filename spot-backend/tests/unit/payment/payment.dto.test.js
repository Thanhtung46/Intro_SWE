import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCreatePaymentDto,
  parseDevConfirmPaymentDto,
  parseTransactionIdParam,
  parseBookingIdParam,
} from '../../../src/domains/payment/dto/create-payment.dto.js';
import {
  formatBookingCode,
  formatInvoiceNumber,
} from '../../../src/domains/payment/entity/payment.entity.js';

test('parseCreatePaymentDto accepts VNPAY', () => {
  const parsed = parseCreatePaymentDto({ bookingId: 42, provider: 'VNPAY' });
  assert.equal(parsed.bookingId, 42);
  assert.equal(parsed.provider, 'VNPAY');
});

test('parseCreatePaymentDto accepts MOMO', () => {
  const parsed = parseCreatePaymentDto({ bookingId: 1, provider: 'MOMO' });
  assert.equal(parsed.provider, 'MOMO');
});

test('parseCreatePaymentDto rejects unknown provider', () => {
  assert.throws(() =>
    parseCreatePaymentDto({ bookingId: 1, provider: 'STRIPE' }),
  );
});

test('parseDevConfirmPaymentDto requires transactionId', () => {
  const parsed = parseDevConfirmPaymentDto({ transactionId: 99 });
  assert.equal(parsed.transactionId, 99);
});

test('parseTransactionIdParam coerces string id', () => {
  const parsed = parseTransactionIdParam({ transactionId: '12' });
  assert.equal(parsed.transactionId, 12);
});

test('parseBookingIdParam coerces string id', () => {
  const parsed = parseBookingIdParam({ bookingId: '7' });
  assert.equal(parsed.bookingId, 7);
});

test('formatBookingCode pads booking id', () => {
  assert.equal(formatBookingCode(42), 'SPOT-000042');
});

test('formatInvoiceNumber includes date and booking id', () => {
  const issuedAt = new Date('2026-08-29T10:00:00Z');
  assert.equal(formatInvoiceNumber(42, issuedAt), 'INV-20260829-000042');
});
