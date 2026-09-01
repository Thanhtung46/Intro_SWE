import { z } from 'zod';

const blankToUndefined = (value) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const createGalleryImageSchema = z.object({
  imageUrl: z
    .string({ required_error: 'imageUrl is required' })
    .trim()
    .min(1, 'imageUrl is required')
    .max(2048, 'imageUrl must be at most 2048 characters')
    .url('imageUrl must be a valid http(s) URL'),
});

export const listGalleryQuerySchema = z.object({
  limit: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(50).optional().default(20),
  ),
  offset: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0).optional().default(0),
  ),
});

export function parseCreateGalleryImageDto(body) {
  return createGalleryImageSchema.parse(body ?? {});
}

export function parseListGalleryQuery(query) {
  return listGalleryQuerySchema.parse(query);
}
