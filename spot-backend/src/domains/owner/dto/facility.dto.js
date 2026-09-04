import { z } from 'zod';
import { SPORT_TYPES, FOOTBALL_VARIANTS } from '../../../shared/constants/venue.js';
import { FIELD_STATUSES } from '../../../shared/constants/owner.js';

const sportValues = Object.values(SPORT_TYPES);
const footballVariantValues = Object.values(FOOTBALL_VARIANTS);
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

function assertFootballVariantConsistency(sportType, footballVariant, ctx) {
  if (sportType === SPORT_TYPES.FOOTBALL && !footballVariant) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'footballVariant is required for Football fields (FIVE_A_SIDE or SEVEN_A_SIDE)',
      path: ['footballVariant'],
    });
  }
  if (sportType === SPORT_TYPES.BADMINTON && footballVariant) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'footballVariant is only valid for Football fields',
      path: ['footballVariant'],
    });
  }
}

const venueBaseSchema = z.object({
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().min(1).max(500),
  amenities: z.string().trim().max(1000).optional().nullable(),
  openingHours: z.string().regex(timeRegex).optional().nullable(),
  closingHours: z.string().regex(timeRegex).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
});

export const createVenueSchema = venueBaseSchema.strict();

export function parseCreateVenueDto(body) {
  return createVenueSchema.parse(body ?? {});
}

export const patchVenueSchema = venueBaseSchema.partial().strict().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'Provide at least one field to update' },
);

export function parsePatchVenueDto(body) {
  return patchVenueSchema.parse(body ?? {});
}

export const venueIdParamSchema = z.object({
  venueId: z.coerce.number().int().positive(),
});

export function parseVenueIdParam(params) {
  return venueIdParamSchema.parse(params);
}

export const fieldIdParamSchema = venueIdParamSchema.extend({
  fieldId: z.coerce.number().int().positive(),
});

export function parseFieldIdParam(params) {
  return fieldIdParamSchema.parse(params);
}

const pricingSchema = z.object({
  pricePerHour: z.coerce.number().positive().max(100_000_000),
  peakPricePerHour: z.coerce.number().positive().max(100_000_000).optional(),
  offPeakPricePerHour: z.coerce.number().positive().max(100_000_000).optional(),
});

export const createFieldSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    sportType: z.enum(sportValues),
    footballVariant: z.enum(footballVariantValues).optional().nullable(),
    capacity: z.coerce.number().int().min(1).max(500).optional().default(10),
    status: z
      .enum([
        FIELD_STATUSES.ACTIVE,
        FIELD_STATUSES.MAINTENANCE,
        FIELD_STATUSES.INACTIVE,
      ])
      .optional()
      .default(FIELD_STATUSES.ACTIVE),
    maintenanceNote: z.string().trim().max(500).optional().nullable(),
  })
  .merge(pricingSchema)
  .strict()
  .superRefine((v, ctx) => assertFootballVariantConsistency(v.sportType, v.footballVariant, ctx));

export function parseCreateFieldDto(body) {
  return createFieldSchema.parse(body ?? {});
}

export const patchFieldSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    sportType: z.enum(sportValues).optional(),
    footballVariant: z.enum(footballVariantValues).optional().nullable(),
    pricePerHour: z.coerce.number().positive().max(100_000_000).optional(),
    peakPricePerHour: z.coerce.number().positive().max(100_000_000).optional(),
    offPeakPricePerHour: z.coerce.number().positive().max(100_000_000).optional(),
    capacity: z.coerce.number().int().min(1).max(500).optional(),
    status: z
      .enum([
        FIELD_STATUSES.ACTIVE,
        FIELD_STATUSES.MAINTENANCE,
        FIELD_STATUSES.INACTIVE,
      ])
      .optional(),
    maintenanceNote: z.string().trim().max(500).optional().nullable(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Provide at least one field to update',
  })
  .superRefine((v, ctx) => {
    // Only cross-checked when sportType is present in this same PATCH — a
    // lone footballVariant update on an existing Football field is fine.
    if (v.sportType !== undefined) {
      assertFootballVariantConsistency(v.sportType, v.footballVariant, ctx);
    }
  });

export function parsePatchFieldDto(body) {
  return patchFieldSchema.parse(body ?? {});
}

export const replaceFieldImagesSchema = z.object({
  images: z
    .array(
      z.object({
        imageUrl: z.string().trim().url().max(2048),
        displayOrder: z.coerce.number().int().min(0).max(100).optional().default(0),
      }),
    )
    .max(20),
});

export function parseReplaceFieldImagesDto(body) {
  return replaceFieldImagesSchema.parse(body ?? {});
}

export const replaceVenueImagesSchema = z.object({
  images: z
    .array(
      z.object({
        imageUrl: z.string().trim().url().max(2048),
        displayOrder: z.coerce.number().int().min(0).max(100).optional().default(0),
      }),
    )
    .max(20),
});

export function parseReplaceVenueImagesDto(body) {
  return replaceVenueImagesSchema.parse(body ?? {});
}
