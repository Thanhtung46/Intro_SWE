import * as paymentService from '../service/payment.service.js';
import {
  parseCreatePaymentDto,
  parseDevConfirmPaymentDto,
  parseTransactionIdParam,
  parseBookingIdParam,
} from '../dto/create-payment.dto.js';
import { PAYMENT_PROVIDERS } from '../../../shared/constants/payment.js';
import config from '../../../shared/config/env.js';

export async function getSummary(req, res, next) {
  try {
    const { bookingId } = parseBookingIdParam(req.params);
    const summary = await paymentService.getPaymentSummary(req.user.userId, bookingId);
    return res.status(200).json({ summary });
  } catch (err) {
    return next(err);
  }
}

export async function create(req, res, next) {
  try {
    const dto = parseCreatePaymentDto(req.body);
    const result = await paymentService.createPayment(req.user.userId, dto);
    const status = result.booking?.status === 'PAID' ? 200 : 201;
    return res.status(status).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getTransaction(req, res, next) {
  try {
    const { transactionId } = parseTransactionIdParam(req.params);
    const result = await paymentService.getTransaction(req.user.userId, transactionId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function devConfirm(req, res, next) {
  try {
    if (!config.payment.debug) {
      return res.status(404).json({ message: 'Not found' });
    }
    const dto = parseDevConfirmPaymentDto(req.body);
    const result = await paymentService.confirmPaymentDev(
      req.user.userId,
      dto.transactionId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function webhookVnpay(req, res, next) {
  try {
    const result = await paymentService.handlePaymentWebhook(
      PAYMENT_PROVIDERS.VNPAY,
      req.body ?? req.query ?? {},
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function webhookMomo(req, res, next) {
  try {
    const result = await paymentService.handlePaymentWebhook(
      PAYMENT_PROVIDERS.MOMO,
      req.body ?? req.query ?? {},
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function stubRedirect(req, res) {
  if (!config.payment.debug) {
    return res.status(404).json({ message: 'Not found' });
  }
  return res.status(200).json({
    message: 'Stub payment redirect — call POST /api/payments/dev/confirm with transactionId',
    ref: req.query.ref,
    provider: req.query.provider,
  });
}
