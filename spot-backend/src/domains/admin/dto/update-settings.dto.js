import { z } from 'zod';

const paymentGatewayToggleSchema = z.object({
  enabled: z.boolean(),
});

export const updateSettingsSchema = z
  .object({
    commissionRatePercent: z.coerce.number().min(0).max(100).optional(),
    paymentGateways: z
      .object({
        momo: paymentGatewayToggleSchema.optional(),
        vnpay: paymentGatewayToggleSchema.optional(),
      })
      .optional(),
    otpExpirySeconds: z.coerce.number().int().min(60).max(3600).optional(),
    defaultCancellationWindowHours: z.coerce
      .number()
      .int()
      .min(1)
      .max(168)
      .optional(),
  })
  .refine(
    (v) =>
      v.commissionRatePercent !== undefined ||
      v.paymentGateways !== undefined ||
      v.otpExpirySeconds !== undefined ||
      v.defaultCancellationWindowHours !== undefined,
    { message: 'Provide at least one setting to update' },
  );

export function parseUpdateSettingsDto(body) {
  return updateSettingsSchema.parse(body);
}
