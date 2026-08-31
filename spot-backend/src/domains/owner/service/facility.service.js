import pool from '../../../shared/database/pool.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import * as facilityRepository from '../repository/facility.repository.js';
import {
  toOwnerVenueSummary,
  toOwnerVenueDetail,
  toOwnerField,
  toOwnerVenueImage,
} from '../entity/owner.entity.js';

async function getFieldWithAvailability(client, fieldRow) {
  const fields = await facilityRepository.listFieldsForVenue(
    client,
    fieldRow.venue_id,
  );
  const match = fields.find((f) => f.field_id === fieldRow.field_id);
  return toOwnerField(match ?? fieldRow);
}

export async function listVenues(ownerId) {
  const client = await pool.connect();
  try {
    const rows = await facilityRepository.listVenuesByOwner(client, ownerId);
    return { items: rows.map(toOwnerVenueSummary) };
  } finally {
    client.release();
  }
}

export async function createVenue(ownerId, dto) {
  const client = await pool.connect();
  try {
    const row = await facilityRepository.insertVenue(client, ownerId, dto);
    return {
      message: 'Venue created successfully',
      venue: toOwnerVenueDetail(row),
    };
  } finally {
    client.release();
  }
}

export async function getVenueDetail(ownerId, venueId) {
  const client = await pool.connect();
  try {
    const venue = await facilityRepository.findVenueForOwner(
      client,
      venueId,
      ownerId,
    );
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }
    const [fields, images] = await Promise.all([
      facilityRepository.listFieldsForVenue(client, venueId),
      facilityRepository.listImagesByVenueId(client, venueId),
    ]);
    return {
      venue: toOwnerVenueDetail(venue),
      fields: fields.map(toOwnerField),
      images: images.map(toOwnerVenueImage),
    };
  } finally {
    client.release();
  }
}

export async function patchVenue(ownerId, venueId, dto) {
  const client = await pool.connect();
  try {
    const updated = await facilityRepository.updateVenue(
      client,
      venueId,
      ownerId,
      dto,
    );
    if (!updated) {
      throw new AppError('Venue not found', 404);
    }
    return {
      message: 'Venue updated successfully',
      venue: toOwnerVenueDetail(updated),
    };
  } finally {
    client.release();
  }
}

export async function createField(ownerId, venueId, dto) {
  const client = await pool.connect();
  try {
    const venue = await facilityRepository.findVenueForOwner(
      client,
      venueId,
      ownerId,
    );
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }
    const row = await facilityRepository.insertField(client, venueId, dto);
    const field = await getFieldWithAvailability(client, row);
    return {
      message: 'Field created successfully',
      field,
    };
  } finally {
    client.release();
  }
}

export async function patchField(ownerId, venueId, fieldId, dto) {
  const client = await pool.connect();
  try {
    const existing = await facilityRepository.findFieldForOwner(
      client,
      fieldId,
      venueId,
      ownerId,
    );
    if (!existing) {
      throw new AppError('Field not found', 404);
    }
    const updated = await facilityRepository.updateField(client, fieldId, dto);
    const field = await getFieldWithAvailability(client, updated);
    return {
      message: 'Field updated successfully',
      field,
    };
  } finally {
    client.release();
  }
}

export async function deleteField(ownerId, venueId, fieldId) {
  const client = await pool.connect();
  try {
    const existing = await facilityRepository.findFieldForOwner(
      client,
      fieldId,
      venueId,
      ownerId,
    );
    if (!existing) {
      throw new AppError('Field not found', 404);
    }
    await facilityRepository.softDeleteField(client, fieldId);
    return { message: 'Field marked inactive successfully' };
  } finally {
    client.release();
  }
}

export async function replaceVenueImages(ownerId, venueId, dto) {
  const client = await pool.connect();
  try {
    const venue = await facilityRepository.findVenueForOwner(
      client,
      venueId,
      ownerId,
    );
    if (!venue) {
      throw new AppError('Venue not found', 404);
    }

    await client.query('BEGIN');
    try {
      const images = await facilityRepository.replaceVenueImages(
        client,
        venueId,
        dto.images,
      );
      await client.query('COMMIT');
      return {
        message: 'Venue images updated successfully',
        images: images.map(toOwnerVenueImage),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
  }
}
