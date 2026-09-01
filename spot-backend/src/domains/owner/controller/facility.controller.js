import * as facilityService from '../service/facility.service.js';
import {
  parseCreateVenueDto,
  parsePatchVenueDto,
  parseVenueIdParam,
  parseFieldIdParam,
  parseCreateFieldDto,
  parsePatchFieldDto,
  parseReplaceVenueImagesDto,
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
