import multer from 'multer';

const storage = multer.memoryStorage();

/** Allowed MIME types for product/avatar images (no exotic image/*) */
export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (ALLOWED_IMAGE_MIMES.includes(mime as any)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed. Max size 5MB.'));
    }
  },
});

/** Admin general upload: images (5MB) + videos (50MB). Rejects executables and unknown types. */
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm'] as const;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const uploadForAdmin = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const isImage = ALLOWED_IMAGE_MIMES.includes(mime as any);
    const isVideo = ALLOWED_VIDEO_MIMES.includes(mime as any);
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, WebP, GIF) or videos (MP4, WebM) are allowed.'));
    }
  },
});