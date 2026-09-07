import { randomBytes } from 'crypto';
import config from '../../../../shared/config/env.js';
import { PAYMENT_PROVIDERS } from '../../../../shared/constants/payment.js';

/**
 * @typedef {Object} CreatePaymentResult
 * @property {string} providerRef
 * @property {string} paymentUrl
 * @property {string} [devConfirmPath]
 */

/**
 * @param {{ provider: string, providerRef: string, amountVnd: number, bookingId: number }} input
 * @returns {CreatePaymentResult}
 */
export function createStubPayment(input) {
  const base = config.publicBaseUrl.replace(/\/$/, '');
  const devConfirmPath = `/api/payments/dev/confirm`;

  return {
    providerRef: input.providerRef,
    paymentUrl: `${base}/payments/stub/redirect?ref=${encodeURIComponent(input.providerRef)}&provider=${input.provider}`,
    devConfirmPath,
  };
}

/**
 * @param {string} provider
 * @param {Record<string, unknown>} _payload
 */
export function verifyStubWebhook(provider, _payload) {
  if (!Object.values(PAYMENT_PROVIDERS).includes(provider)) {
    return { ok: false, reason: 'unknown_provider' };
  }
  return { ok: true };
}

export function generateProviderRef(provider, bookingId) {
  const suffix = randomBytes(4).toString('hex');
  return `${provider}-${bookingId}-${Date.now()}-${suffix}`;
}

export function buildIdempotencyKey(provider, providerRef) {
  return `${provider}:${providerRef}`;
}
