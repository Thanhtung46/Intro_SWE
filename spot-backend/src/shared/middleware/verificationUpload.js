import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { AppError } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const VERIFICATION_UPLOAD_DIR = path.resolve(
  __dirname,
  '../../../uploads/verification',
);

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

fs.mkdirSync(VERIFICATION_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, VERIFICATION_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)
      ? ext === '.jpeg'
        ? '.jpg'
        : ext
      : '.pdf';
    cb(null, `${req.user.userId}-${Date.now()}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new AppError('Document must be a PDF, JPEG, or PNG file', 400),
    );
  }
  return cb(null, true);
}

export const verificationUpload = multer({
  storage,
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
