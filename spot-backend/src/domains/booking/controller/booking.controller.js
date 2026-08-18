import { parseFieldAvailabilityQuery } from '../dto/availability.dto.js';
import { parseCreateBookingDto } from '../dto/create-booking.dto.js';
import { parseCreateBookingBulkDto } from '../dto/create-booking-bulk.dto.js';
import * as bookingService from '../service/booking.service.js';

export async function availability(req, res, next) {
  try {
    const venueId = Number(req.params.venueId);
    const fieldId = Number(req.params.fieldId);
    if (!Number.isInteger(venueId) || venueId < 1 || !Number.isInteger(fieldId) || fieldId < 1) {
      return res.status(400).json({ message: 'Invalid venueId or fieldId' });
    }
    const dto = parseFieldAvailabilityQuery(req.query);
    const result = await bookingService.getFieldAvailability(venueId, fieldId, dto.date);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function create(req, res, next) {
  try {
    const dto = parseCreateBookingDto(req.body);
    const booking = await bookingService.createBooking(req.user.userId, dto);
    return res.status(201).json({ booking });
  } catch (err) {
    return next(err);
  }
}

export async function createBulk(req, res, next) {
  try {
    const dto = parseCreateBookingBulkDto(req.body);
    const result = await bookingService.createBookingsBulk(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}
