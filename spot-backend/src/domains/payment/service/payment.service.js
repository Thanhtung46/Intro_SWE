import pool from '../../../shared/database/pool.js';
import redis from '../../../shared/database/redis.js';
import config from '../../../shared/config/env.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import {
  PAYMENT_PROVIDERS,
  TRANSACTION_STATUSES,
} from '../../../shared/constants/payment.js';
import { NOTIFICATION_TYPES } from '../../../shared/constants/notification.js';
import * as systemSettingsRepository from '../../admin/repository/system-settings.repository.js';
import {
  confirmBookingPaidAfterPayment,
  runPostPaidSideEffects,
} from '../../booking/service/booking.service.js';
import * as notificationService from '../../notification/service/notification.service.js';
import * as userRepository from '../../auth/repository/user.repository.js';
import { sendPaymentInvoiceEmail } from '../../../shared/utils/mailer.js';
import logger from '../../../shared/utils/logger.js';
import * as paymentRepository from '../repository/payment.repository.js';
import { formatTimeInZone } from '../../booking/entity/booking.entity.js';
import {
  toPublicTransaction,
  toPublicPaymentSummary,
  formatBookingCode,
  formatInvoiceNumber,
} from '../entity/payment.entity.js';
import { generateInvoicePdf } from './invoice.service.js';
import {
  createGatewayPayment,
  verifyGatewayWebhook,
  generateProviderRef,
  buildIdempotencyKey,
} from './gateways/index.js';

function providerSettingKey(provider) {
  return provider === PAYMENT_PROVIDERS.VNPAY ? 'vnpay' : 'momo';
}

function computePayableAmountVnd(bookingRow) {
  const deposit = Math.round(Number(bookingRow.deposit_amount));
  const refereeFee =
    bookingRow.hire_referee && bookingRow.referee_fee_vnd != null
      ? Math.round(Number(bookingRow.referee_fee_vnd))
      : 0;
  return deposit + refereeFee;
}

async function getPaymentGateways() {
  const client = await pool.connect();
  try {
    const settings = await systemSettingsRepository.getCachedSettings(redis, client);
    return settings.paymentGateways ?? {
      momo: { enabled: false },
      vnpay: { enabled: false },
    };
  } finally {
    client.release();
  }
}

function assertGatewayEnabled(gateways, provider) {
  if (config.payment.debug) {
    return;
  }
  const key = providerSettingKey(provider);
  if (!gateways?.[key]?.enabled) {
    throw new AppError(`Payment gateway ${provider} is not enabled`, 503);
  }
}

export async function getPaymentSummary(playerId, bookingId) {
  const client = await pool.connect();
  try {
    const booking = await paymentRepository.findBookingSummaryForPayment(
      client,
      bookingId,
      playerId,
    );
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new AppError('Booking is not awaiting payment', 409);
    }

    const gateways = await getPaymentGateways();
    return toPublicPaymentSummary({ ...booking, gateways });
  } finally {
    client.release();
  }
}

export async function createPayment(playerId, dto) {
  const client = await pool.connect();
  try {
    const booking = await paymentRepository.findBookingSummaryForPayment(
      client,
      dto.bookingId,
      playerId,
    );
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new AppError('Booking is not awaiting payment', 409);
    }

    const gateways = await getPaymentGateways();
    assertGatewayEnabled(gateways, dto.provider);

    const active = await paymentRepository.findActiveTransactionForBooking(
      client,
      dto.bookingId,
    );
    if (active?.status === TRANSACTION_STATUSES.SUCCESS) {
      throw new AppError('Booking is already paid', 409);
    }
    if (active?.status === TRANSACTION_STATUSES.PENDING) {
      const now = new Date();
      if (new Date(active.expires_at) > now) {
        if (config.payment.debug) {
          return confirmPaymentSuccess(active.transaction_id, {
            source: 'instant_stub',
          });
        }
        return {
          message: 'Payment already in progress',
          transaction: toPublicTransaction(active, {
            devConfirmPath: config.payment.debug ? '/api/payments/dev/confirm' : undefined,
          }),
        };
      }
    }

    const amountVnd = computePayableAmountVnd(booking);
    const expiresAt = new Date(Date.now() + config.payment.ttlSeconds * 1000);
    const providerRef = generateProviderRef(dto.provider, dto.bookingId);
    const gatewayResult = createGatewayPayment({
      provider: dto.provider,
      providerRef,
      amountVnd,
      bookingId: dto.bookingId,
    });

    await client.query('BEGIN');

    const transaction = await paymentRepository.insertTransaction(client, {
      bookingId: dto.bookingId,
      playerId,
      provider: dto.provider,
      amountVnd,
      providerRef: gatewayResult.providerRef,
      idempotencyKey: buildIdempotencyKey(dto.provider, gatewayResult.providerRef),
      paymentUrl: gatewayResult.paymentUrl,
      expiresAt,
    });

    await paymentRepository.setBookingPaymentExpiresAt(
      client,
      dto.bookingId,
      expiresAt,
    );

    await client.query('COMMIT');

    if (config.payment.debug) {
      return confirmPaymentSuccess(transaction.transaction_id, {
        source: 'instant_stub',
      });
    }

    return {
      message: 'Payment created',
      transaction: toPublicTransaction(transaction, {
        devConfirmPath: gatewayResult.devConfirmPath,
      }),
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function getTransaction(playerId, transactionId) {
  const client = await pool.connect();
  try {
    const row = await paymentRepository.findTransactionByIdForPlayer(
      client,
      transactionId,
      playerId,
    );
    if (!row) {
      throw new AppError('Transaction not found', 404);
    }

    return {
      transaction: toPublicTransaction(row, {
        bookingCode: row.booking_code ?? null,
        invoiceNumber: row.invoice_number ?? null,
        bookingStatus: row.booking_status,
        summary: {
          venueName: row.venue_name,
          fieldName: row.field_name,
          bookingDate:
            typeof row.booking_date === 'string'
              ? row.booking_date.slice(0, 10)
              : row.booking_date,
          startTime: formatTimeInZone(row.starts_at),
          endTime: formatTimeInZone(row.ends_at),
        },
      }),
    };
  } finally {
    client.release();
  }
}

/**
 * Core payment confirmation — idempotent when transaction already SUCCESS.
 */
export async function confirmPaymentSuccess(transactionId, rawCallback = {}) {
  const client = await pool.connect();
  let booking;
  let transaction;
  let invoiceNumber;
  let pdfPath;
  let amountVnd;
  let provider;
  let bookingCode;
  let summaryRow;

  try {
    await client.query('BEGIN');

    transaction = await paymentRepository.findTransactionByIdForUpdate(
      client,
      transactionId,
    );
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.status === TRANSACTION_STATUSES.SUCCESS) {
      const existing = await paymentRepository.findTransactionByIdForPlayer(
        client,
        transactionId,
        transaction.player_id,
      );
      await client.query('COMMIT');
      return {
        message: 'Payment already confirmed',
        duplicate: true,
        transaction: toPublicTransaction(existing, {
          bookingCode: existing.booking_code,
          invoiceNumber: existing.invoice_number,
        }),
      };
    }

    if (transaction.status !== TRANSACTION_STATUSES.PENDING) {
      throw new AppError(`Cannot confirm transaction in status ${transaction.status}`, 409);
    }

    const now = new Date();
    if (new Date(transaction.expires_at) < now) {
      throw new AppError('Payment session has expired', 410);
    }

    summaryRow = await paymentRepository.findBookingSummaryForPayment(
      client,
      transaction.booking_id,
      transaction.player_id,
    );
    if (!summaryRow || summaryRow.status !== 'PENDING_PAYMENT') {
      throw new AppError('Booking is not awaiting payment', 409);
    }

    bookingCode = formatBookingCode(transaction.booking_id);
    booking = await confirmBookingPaidAfterPayment(client, {
      bookingId: transaction.booking_id,
      playerId: transaction.player_id,
      bookingCode,
    });
    if (!booking) {
      throw new AppError('Booking not found or not pending payment', 404);
    }

    transaction = await paymentRepository.markTransactionSuccess(
      client,
      transactionId,
      rawCallback,
    );

    invoiceNumber = formatInvoiceNumber(transaction.booking_id, now);
    amountVnd = transaction.amount_vnd;
    provider = transaction.provider;

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const pdfResult = await generateInvoicePdf({
    invoiceNumber,
    bookingCode,
    venueName: summaryRow.venue_name,
    fieldName: summaryRow.field_name,
    bookingDate:
      typeof summaryRow.booking_date === 'string'
        ? summaryRow.booking_date.slice(0, 10)
        : summaryRow.booking_date,
    startsAt: summaryRow.starts_at,
    endsAt: summaryRow.ends_at,
    amountVnd,
    provider,
    paidAt: new Date(),
  });
  pdfPath = pdfResult.pdfPath;

  const invoiceClient = await pool.connect();
  try {
    await invoiceClient.query('BEGIN');
    await paymentRepository.insertInvoice(invoiceClient, {
      transactionId,
      bookingId: transaction.booking_id,
      invoiceNumber,
      pdfPath: pdfResult.publicUrl,
      amountVnd,
    });
    await invoiceClient.query('COMMIT');
  } catch (err) {
    await invoiceClient.query('ROLLBACK');
    logger.warn('Invoice insert failed after payment confirmed', {
      transactionId,
      error: err.message,
    });
  } finally {
    invoiceClient.release();
  }

  await runPostPaidSideEffects(booking, transaction.booking_id);

  const notifyClient = await pool.connect();
  try {
    const user = await userRepository.findById(notifyClient, transaction.player_id);
    await notificationService.createNotification({
      userId: transaction.player_id,
      type: NOTIFICATION_TYPES.BOOKING_PAYMENT_SUCCESS,
      title: 'Payment successful',
      body: `Your booking ${bookingCode} is confirmed. See your invoice for details.`,
      data: {
        bookingId: transaction.booking_id,
        bookingCode,
        transactionId,
        invoiceNumber,
      },
      sendEmail: false,
    });

    if (user?.email) {
      await sendPaymentInvoiceEmail({
        email: user.email,
        invoiceNumber,
        bookingCode,
        pdfPath,
      }).catch((err) => {
        logger.warn('Payment invoice email failed', {
          transactionId,
          error: err.message,
        });
      });
    }
  } finally {
    notifyClient.release();
  }

  return {
    message: 'Payment confirmed',
    transaction: toPublicTransaction(transaction, {
      bookingCode,
      invoiceNumber,
    }),
    booking: {
      bookingId: booking.booking_id,
      bookingCode,
      status: booking.status,
    },
  };
}

export async function confirmPaymentDev(playerId, transactionId) {
  const client = await pool.connect();
  try {
    const row = await paymentRepository.findTransactionByIdForPlayer(
      client,
      transactionId,
      playerId,
    );
    if (!row) {
      throw new AppError('Transaction not found', 404);
    }
  } finally {
    client.release();
  }

  return confirmPaymentSuccess(transactionId, { source: 'dev_confirm' });
}

export async function handlePaymentWebhook(provider, payload) {
  const verification = verifyGatewayWebhook(provider, payload);
  if (!verification.ok) {
    throw new AppError('Invalid webhook', 400);
  }

  const providerRef =
    payload?.providerRef ??
    payload?.TxnRef ??
    payload?.orderId ??
    payload?.requestId;
  if (!providerRef) {
    throw new AppError('Missing provider reference', 400);
  }

  const client = await pool.connect();
  try {
    const transaction = await paymentRepository.findTransactionByProviderRef(
      client,
      provider,
      String(providerRef),
    );
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    const isSuccess =
      payload?.status === 'SUCCESS' ||
      payload?.resultCode === 0 ||
      payload?.vnp_ResponseCode === '00' ||
      payload?.success === true;

    if (!isSuccess) {
      await paymentRepository.markTransactionFailed(
        client,
        transaction.transaction_id,
        payload?.message ?? 'Payment failed',
        payload,
      );
      return { message: 'Payment failure recorded', status: TRANSACTION_STATUSES.FAILED };
    }

    return confirmPaymentSuccess(transaction.transaction_id, payload);
  } finally {
    client.release();
  }
}

export async function processExpiredPayments(limit = 50) {
  const client = await pool.connect();
  const processed = [];
  try {
    const expired = await paymentRepository.listExpiredPendingTransactions(client, limit);
    for (const row of expired) {
      await client.query('BEGIN');
      try {
        const txn = await paymentRepository.markTransactionExpired(
          client,
          row.transaction_id,
        );
        if (txn) {
          await paymentRepository.cancelBookingForExpiredPayment(
            client,
            row.booking_id,
          );
          await notificationService.cancelRemindersForBooking(row.booking_id).catch(
            () => {},
          );
        }
        await client.query('COMMIT');
        if (txn) {
          processed.push({
            transactionId: row.transaction_id,
            bookingId: row.booking_id,
          });
        }
      } catch (err) {
        await client.query('ROLLBACK');
        logger.warn('Failed to expire payment', {
          transactionId: row.transaction_id,
          error: err.message,
        });
      }
    }
  } finally {
    client.release();
  }
  return { processed: processed.length, items: processed };
}
