import { z } from 'zod';
import { PAYMENT_PROVIDERS } from '../../../shared/constants/payment.js';

export const createPaymentSchema = z
  .object({
    bookingId: z.coerce.number().int().positive(),
    provider: z.enum([PAYMENT_PROVIDERS.VNPAY, PAYMENT_PROVIDERS.MOMO]),
  })
  .strict();

export function parseCreatePaymentDto(body) {
  return createPaymentSchema.parse(body ?? {});
}

export const devConfirmPaymentSchema = z
  .object({
    transactionId: z.coerce.number().int().positive(),
  })
  .strict();

export function parseDevConfirmPaymentDto(body) {
  return devConfirmPaymentSchema.parse(body ?? {});
}

export const transactionIdParamSchema = z.object({
  transactionId: z.coerce.number().int().positive(),
});

export function parseTransactionIdParam(params) {
  return transactionIdParamSchema.parse(params ?? {});
}

export const bookingIdParamSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

export function parseBookingIdParam(params) {
  return bookingIdParamSchema.parse(params ?? {});
}
