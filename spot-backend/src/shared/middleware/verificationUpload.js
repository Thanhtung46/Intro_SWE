import path from 'path';
import multer from 'multer';
import { AppError } from '../middleware/errorHandler.js';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

/** Safe extension for a Supabase Storage object key — never trust the raw upload filename. */
export function safeVerificationExt(originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) return '.pdf';
  return ext === '.jpeg' ? '.jpg' : ext;
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new AppError('Document must be a PDF, JPEG, or PNG file', 400),
    );
  }
  return cb(null, true);
}

// Buffer in memory, not local disk — the service streams it to Supabase
// Storage (see supabaseStorage.js) so documents survive server restarts.
export const verificationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).single('document');

export function runVerificationUpload(req, res, next) {
  verificationUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof AppError) return next(err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Document must be at most 5MB', 400));
      }
      return next(new AppError(err.message, 400));
    }
    return next(err);
  });
}
