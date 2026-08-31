import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AVATAR_UPLOAD_DIR = path.resolve(
  __dirname,
  '../../../uploads/avatars',
);

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
      ? ext === '.jpeg'
        ? '.jpg'
        : ext
      : '.jpg';
    cb(null, `${req.user.userId}-${Date.now()}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new AppError('Avatar must be a jpeg, png, webp, or gif image', 400),
    );
  }
  return cb(null, true);
}

export const avatarUpload = multer({
  storage,
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
