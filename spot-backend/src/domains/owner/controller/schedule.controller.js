import * as scheduleService from '../service/schedule.service.js';
import {
  parseScheduleQueryDto,
  parseCreateManualBookingDto,
  parseBookingIdParam,
} from '../dto/schedule.dto.js';

export async function getSchedule(req, res, next) {
  try {
    const query = parseScheduleQueryDto(req.query);
    const result = await scheduleService.getSchedule(req.user.userId, query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function createBooking(req, res, next) {
  try {
    const dto = parseCreateManualBookingDto(req.body);
    const booking = await scheduleService.createManualBooking(req.user.userId, dto);
    return res.status(201).json({ booking });
  } catch (err) {
    return next(err);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const { bookingId } = parseBookingIdParam(req.params);
    const booking = await scheduleService.cancelBooking(req.user.userId, bookingId);
    return res.status(200).json({ booking });
  } catch (err) {
    return next(err);
  }
}
