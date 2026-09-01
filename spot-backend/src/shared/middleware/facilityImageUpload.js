import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FACILITY_IMAGE_UPLOAD_DIR = path.resolve(
  __dirname,
  '../../../uploads/facilities',
);

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILES = 20;

fs.mkdirSync(FACILITY_IMAGE_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, FACILITY_IMAGE_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
      ? ext === '.jpeg'
        ? '.jpg'
        : ext
      : '.jpg';
    cb(null, `${req.user.userId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new AppError('Photos must be jpeg, png, webp, or gif images', 400),
    );
  }
  return cb(null, true);
}

export const facilityImageUpload = multer({
  storage,
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
