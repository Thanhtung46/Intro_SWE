import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { normalizeSportType } from '../../../shared/constants/venue.js';
import * as venueRepository from '../repository/venue.repository.js';
import { toPublicVenue, toPublicField, toPublicVenueImage } from '../entity/venue.entity.js';

export async function listVenues(sportInput, { lat, long, radiusKm } = {}) {
  const sportType = normalizeSportType(sportInput);
  if (!sportType) {
    throw new AppError('Unsupported sport', 400);
  }

  const client = await pool.connect();
  try {
    const rows = await venueRepository.listActiveVenuesBySport(
      client,
      sportType,
      { lat, long, radiusKm },
    );
    return rows.map(toPublicVenue);
  } finally {
    client.release();
  }
}

export async function getVenueDetail(venueId) {
  const client = await pool.connect();
  try {
    const venue = await venueRepository.findVenueById(client, venueId);
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }
    const fields = await venueRepository.listFieldsByVenueId(client, venueId);
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
    return { images: images.map(toPublicVenueImage) };
  } finally {
    client.release();
  }
}
