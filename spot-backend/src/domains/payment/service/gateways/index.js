import config from '../../../../shared/config/env.js';
import { PAYMENT_PROVIDERS } from '../../../../shared/constants/payment.js';
import {
  createStubPayment,
  verifyStubWebhook,
  generateProviderRef,
} from './stub.gateway.js';
import { createVnpayPayment, verifyVnpayWebhook } from './vnpay.gateway.js';
import { createMomoPayment, verifyMomoWebhook } from './momo.gateway.js';

export function createGatewayPayment(input) {
  if (config.payment.debug) {
    const providerRef = generateProviderRef(input.provider, input.bookingId);
    return createStubPayment({ ...input, providerRef });
  }

  if (input.provider === PAYMENT_PROVIDERS.VNPAY) {
    return createVnpayPayment(input);
  }
  if (input.provider === PAYMENT_PROVIDERS.MOMO) {
    return createMomoPayment(input);
  }

  throw new Error(`Unsupported provider: ${input.provider}`);
}

export function verifyGatewayWebhook(provider, payload) {
  if (config.payment.debug) {
    return verifyStubWebhook(provider, payload);
  }

  if (provider === PAYMENT_PROVIDERS.VNPAY) {
    return verifyVnpayWebhook(payload);
  }
  if (provider === PAYMENT_PROVIDERS.MOMO) {
    return verifyMomoWebhook(payload);
  }

  return { ok: false, reason: 'unknown_provider' };
}

export { generateProviderRef, buildIdempotencyKey } from './stub.gateway.js';
