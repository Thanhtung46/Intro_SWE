import { z } from 'zod';
import { SPORT_TYPES } from '../../../shared/constants/venue.js';

const sportValues = Object.values(SPORT_TYPES);
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleQuerySchema = z.object({
  venueId: z.coerce.number().int().positive(),
  date: z.string().regex(dateRegex),
  sport: z.enum(sportValues).optional(),
});

export function parseScheduleQueryDto(query) {
  return scheduleQuerySchema.parse(query ?? {});
}

export const createManualBookingSchema = z.object({
  fieldId: z.coerce.number().int().positive(),
  bookingDate: z.string().regex(dateRegex),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  customerName: z.string().trim().min(1).max(150),
  customerPhone: z.string().trim().min(1).max(30).optional().nullable(),
  totalAmount: z.coerce.number().min(0).max(100_000_000),
  markPaid: z.boolean().optional().default(false),
}).refine((v) => v.startTime < v.endTime, {
  message: 'startTime must be before endTime',
  path: ['endTime'],
});

export function parseCreateManualBookingDto(body) {
  return createManualBookingSchema.parse(body ?? {});
}

export const bookingIdParamSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

export function parseBookingIdParam(params) {
  return bookingIdParamSchema.parse(params);
}
