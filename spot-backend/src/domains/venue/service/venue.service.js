import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { normalizeSportType } from '../../../shared/constants/venue.js';
import * as venueRepository from '../repository/venue.repository.js';
import { toPublicVenue, toPublicField, toPublicVenueImage } from '../entity/venue.entity.js';

export async function listVenues(
  sportInput,
  { location, lat, long, radiusKm, province, city, priceMin, priceMax, date, timeFrom, timeTo } = {},
) {
  const sportType = normalizeSportType(sportInput);
  if (!sportType) {
    throw new AppError('Unsupported sport', 400);
  }

  const client = await pool.connect();
  try {
    const rows = await venueRepository.listActiveVenuesBySport(
      client,
      sportType,
      { location, lat, long, radiusKm, province, city, priceMin, priceMax, date, timeFrom, timeTo },
    );
    return rows.map(toPublicVenue);
  } finally {
    client.release();
  }
}

export async function getVenueDetail(venueId, sportType = null) {
  const client = await pool.connect();
  try {
    const venue = await venueRepository.findVenueById(client, venueId);
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }
    const fields = await venueRepository.listFieldsByVenueId(client, venueId, sportType);
    return {
      venue: toPublicVenue(venue),
      fields: fields.map(toPublicField),
    };
  } finally {
    client.release();
  }
}

export async function getVenueImages(venueId) {
  const client = await pool.connect();
  try {
    const venue = await venueRepository.findVenueById(client, venueId);
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }
    const images = await venueRepository.listImagesByVenueId(client, venueId);
    return { images: images.map((row) => toPublicVenueImage(row, venueId)) };
  } finally {
    client.release();
  }
}
