const multer = require('multer');
const { HttpError } = require('../utils/http-error');

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const pdfUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(
        new HttpError(
          400,
          'INVALID_FILE_TYPE',
          'Le fichier doit être au format PDF.',
        ),
      );
    }
    cb(null, true);
  },
});

// Wraps multer.single() so all multer/upload errors map to HttpError before
// they reach the centralized error handler (consistent {error:{code,message}}).
function uploadPdf(field) {
  const handler = pdfUploader.single(field);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) return next();
      if (err instanceof HttpError) return next(err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new HttpError(
            400,
            'FILE_TOO_LARGE',
            'Le fichier dépasse la taille maximale de 25 Mo.',
          ),
        );
      }
      return next(
        new HttpError(
          400,
          'UPLOAD_ERROR',
          err.message || 'Échec du téléversement.',
        ),
      );
    });
  };
}

module.exports = { uploadPdf };
