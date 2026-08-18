import { parseListVenuesQuery } from '../dto/list-venues.dto.js';
import * as venueService from '../service/venue.service.js';

export async function list(req, res, next) {
  try {
    const dto = parseListVenuesQuery(req.query);
    const venues = await venueService.listVenues(dto.sport, {
      lat: dto.lat,
      long: dto.long,
      radiusKm: dto.radiusKm,
    });
    return res.status(200).json({ venues });
  } catch (err) {
    return next(err);
  }
}

export async function detail(req, res, next) {
  try {
    const venueId = Number(req.params.venueId);
    if (!Number.isInteger(venueId) || venueId < 1) {
      return res.status(400).json({ message: 'Invalid venueId' });
    }
    const result = await venueService.getVenueDetail(venueId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function images(req, res, next) {
  try {
    const venueId = Number(req.params.venueId);
    if (!Number.isInteger(venueId) || venueId < 1) {
      return res.status(400).json({ message: 'Invalid venueId' });
    }
    const result = await venueService.getVenueImages(venueId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
