import { z } from 'zod';
import { BOOKING_BULK_MAX } from '../../../shared/constants/booking.js';
import { createBookingSchema } from './create-booking.dto.js';

export const createBookingBulkSchema = z
  .object({
    bookings: z
      .array(createBookingSchema)
      .min(1, 'At least one booking is required')
      .max(BOOKING_BULK_MAX, `At most ${BOOKING_BULK_MAX} bookings per request`),
  })
  .strict();

export function parseCreateBookingBulkDto(body) {
  return createBookingBulkSchema.parse(body ?? {});
}
