import path from 'path';
import multer from 'multer';
import { AppError } from '../middleware/errorHandler.js';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Safe extension for a Supabase Storage object key — never trust the raw upload filename. */
export function safeAvatarExt(originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return '.jpg';
  return ext === '.jpeg' ? '.jpg' : ext;
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new AppError('Avatar must be a jpeg, png, webp, or gif image', 400),
    );
  }
  return cb(null, true);
}

// Buffer in memory, not local disk — the service streams it to Supabase
// Storage (see supabaseStorage.js) so avatars survive server restarts.
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
}).single('avatar');

export function runAvatarUpload(req, res, next) {
  avatarUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof AppError) return next(err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Avatar must be at most 2MB', 400));
      }
      return next(new AppError(err.message, 400));
    }
    return next(err);
  });
}
