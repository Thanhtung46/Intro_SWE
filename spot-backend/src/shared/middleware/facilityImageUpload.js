import path from 'path';
import multer from 'multer';
import { AppError } from '../middleware/errorHandler.js';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILES = 20;

/** Safe extension for a Supabase Storage object key — never trust the raw upload filename. */
export function safeImageExt(originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return '.jpg';
  return ext === '.jpeg' ? '.jpg' : ext;
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new AppError('Photos must be jpeg, png, webp, or gif images', 400),
    );
  }
  return cb(null, true);
}

// Buffers in memory (multer.memoryStorage), not written to local disk —
// the controller streams each buffer straight to Supabase Storage so
// uploads survive server restarts/redeploys (see supabaseStorage.js).
export const facilityImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
}).array('images', MAX_FILES);

export function runFacilityImageUpload(req, res, next) {
  facilityImageUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof AppError) return next(err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Each photo must be at most 2MB', 400));
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError(`You can upload at most ${MAX_FILES} photos at once`, 400));
      }
      return next(new AppError(err.message, 400));
    }
    return next(err);
  });
}
