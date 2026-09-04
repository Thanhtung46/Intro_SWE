import * as facilityService from '../service/facility.service.js';
import { AppError } from '../../../shared/middleware/errorHandler.js';
import { uploadBufferToStorage } from '../../../shared/utils/supabaseStorage.js';
import { safeImageExt } from '../../../shared/middleware/facilityImageUpload.js';
import {
  parseCreateVenueDto,
  parsePatchVenueDto,
  parseVenueIdParam,
  parseFieldIdParam,
  parseCreateFieldDto,
  parsePatchFieldDto,
  parseReplaceVenueImagesDto,
  parseReplaceFieldImagesDto,
} from '../dto/facility.dto.js';

export async function listVenues(req, res, next) {
  try {
    const result = await facilityService.listVenues(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function createVenue(req, res, next) {
  try {
    const dto = parseCreateVenueDto(req.body);
    const result = await facilityService.createVenue(req.user.userId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getVenue(req, res, next) {
  try {
    const { venueId } = parseVenueIdParam(req.params);
    const result = await facilityService.getVenueDetail(req.user.userId, venueId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function patchVenue(req, res, next) {
  try {
    const { venueId } = parseVenueIdParam(req.params);
    const dto = parsePatchVenueDto(req.body);
    const result = await facilityService.patchVenue(req.user.userId, venueId, dto);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function createField(req, res, next) {
  try {
    const { venueId } = parseVenueIdParam(req.params);
    const dto = parseCreateFieldDto(req.body);
    const result = await facilityService.createField(req.user.userId, venueId, dto);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function patchField(req, res, next) {
  try {
    const { venueId, fieldId } = parseFieldIdParam(req.params);
    const dto = parsePatchFieldDto(req.body);
    const result = await facilityService.patchField(
      req.user.userId,
      venueId,
      fieldId,
      dto,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function deleteField(req, res, next) {
  try {
    const { venueId, fieldId } = parseFieldIdParam(req.params);
    const result = await facilityService.deleteField(
      req.user.userId,
      venueId,
      fieldId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function replaceFieldImages(req, res, next) {
  try {
    const { venueId, fieldId } = parseFieldIdParam(req.params);
    const dto = parseReplaceFieldImagesDto(req.body);
    const result = await facilityService.replaceFieldImages(
      req.user.userId,
      venueId,
      fieldId,
      dto,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function replaceImages(req, res, next) {
  try {
    const { venueId } = parseVenueIdParam(req.params);
    const dto = parseReplaceVenueImagesDto(req.body);
    const result = await facilityService.replaceVenueImages(
      req.user.userId,
      venueId,
      dto,
    );
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function uploadImages(req, res, next) {
  try {
    const files = req.files ?? [];
    if (!files.length) {
      throw new AppError('At least one photo is required (field name: images)', 400);
    }
    const urls = await Promise.all(
      files.map((file) => {
        const objectPath = `facilities/${req.user.userId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeImageExt(file.originalname)}`;
        return uploadBufferToStorage(objectPath, file.buffer, file.mimetype);
      }),
    );
    return res.status(200).json({ urls });
  } catch (err) {
    return next(err);
  }
}
