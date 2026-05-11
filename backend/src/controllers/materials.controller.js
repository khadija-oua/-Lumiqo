const path = require('path');

const materialsService = require('../services/materials.service');
const coursesService = require('../services/courses.service');
const accessService = require('../services/access.service');
const driveService = require('../services/drive.service');
const { HttpError } = require('../utils/http-error');

async function upload(req, res, next) {
  let driveFileId = null;
  try {
    const courseId = Number(req.params.courseId);
    const { title } = req.body;

    const course = await coursesService.findById(courseId);
    if (!course) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
    }
    // Spec: only the teacher who owns the course can upload.
    if (course.teacher_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }
    if (!req.file) {
      throw new HttpError(
        400,
        'FILE_REQUIRED',
        'Un fichier PDF est requis (champ "file").',
      );
    }

    // Multer's fileFilter already enforces application/pdf. Re-check defensively.
    if (req.file.mimetype !== 'application/pdf') {
      throw new HttpError(
        400,
        'INVALID_FILE_TYPE',
        'Le fichier doit être au format PDF.',
      );
    }

    // Use original filename, force a .pdf extension.
    const baseName = path.parse(req.file.originalname || 'document.pdf').name;
    const driveFilename = `${baseName}.pdf`;

    const uploaded = await driveService.uploadPdf(
      req.file.buffer,
      driveFilename,
      'application/pdf',
    );
    driveFileId = uploaded.fileId;

    let material;
    try {
      material = await materialsService.create({
        courseId,
        title: title.trim(),
        fileType: 'pdf',
        driveFileId: uploaded.fileId,
        driveUrl: uploaded.webViewLink,
        uploadedBy: req.user.id,
      });
    } catch (dbErr) {
      // DB insert failed after a successful Drive upload — compensate by
      // deleting the orphan file. Log both attempts loudly.
      console.error(
        `[materials.upload] DB insert failed after Drive upload (fileId=${uploaded.fileId}):`,
        dbErr.message,
      );
      try {
        await driveService.deleteFile(uploaded.fileId);
        console.warn(
          `[materials.upload] Compensating delete OK for Drive fileId=${uploaded.fileId}`,
        );
      } catch (rollbackErr) {
        console.error(
          `[materials.upload] CRITICAL: rollback failed, Drive file is orphaned (fileId=${uploaded.fileId}):`,
          rollbackErr.message,
        );
      }
      throw dbErr;
    }

    res.status(201).json({ material });
  } catch (err) {
    // If we got as far as a Drive upload but failed before DB insert (e.g.
    // throw between the two), the rollback inside the inner try/catch already
    // covers DB failures. This outer catch handles anything else.
    if (driveFileId && !(err instanceof HttpError)) {
      // Unknown error after Drive upload — try to clean up.
      try {
        await driveService.deleteFile(driveFileId);
      } catch (_) {
        /* already logged below if needed */
      }
    }
    next(err);
  }
}

async function listForCourse(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    await accessService.ensureCourseReadAccess(req.user, courseId);
    const materials = await materialsService.listForCourse(courseId);
    res.json({ materials });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const material = await materialsService.findById(id);
    if (!material) {
      throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Matériel introuvable.');
    }

    const course = await coursesService.findById(material.course_id);
    // course should exist (FK), but guard anyway
    if (!course) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
    }
    if (req.user.role !== 'admin' && course.teacher_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
    }

    if (material.drive_file_id) {
      try {
        await driveService.deleteFile(material.drive_file_id);
      } catch (driveErr) {
        // Tolerate "file already missing" (404) — keep the deletion idempotent.
        const status = driveErr.code || driveErr.response?.status;
        if (status !== 404) {
          console.error(
            `[materials.remove] Drive delete failed (fileId=${material.drive_file_id}):`,
            driveErr.message,
          );
          throw new HttpError(
            502,
            'DRIVE_ERROR',
            'Échec de la suppression du fichier sur Google Drive.',
          );
        }
        console.warn(
          `[materials.remove] Drive file already missing (fileId=${material.drive_file_id}), continuing.`,
        );
      }
    }

    await materialsService.deleteById(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const id = Number(req.params.id);
    const material = await materialsService.findById(id);
    if (!material) {
      throw new HttpError(404, 'MATERIAL_NOT_FOUND', 'Matériel introuvable.');
    }

    await accessService.ensureCourseReadAccess(req.user, material.course_id);

    if (!material.drive_file_id) {
      throw new HttpError(
        404,
        'NO_FILE',
        'Ce matériel ne contient pas de fichier téléchargeable.',
      );
    }

    let stream;
    try {
      stream = await driveService.getDownloadStream(material.drive_file_id);
    } catch (driveErr) {
      const status = driveErr.code || driveErr.response?.status;
      if (status === 404) {
        // The DB row points at a Drive file that no longer exists (deleted
        // outside SmartMoodle, or carried over from a previous Drive auth
        // setup). Surface as 410 GONE so clients can prompt a re-upload.
        console.warn(
          `[materials.download] Drive file gone (fileId=${material.drive_file_id})`,
        );
        throw new HttpError(
          410,
          'DRIVE_FILE_GONE',
          "Ce document n'est plus disponible sur Google Drive. Veuillez contacter votre enseignant pour qu'il le téléverse à nouveau.",
        );
      }
      console.error(
        `[materials.download] Drive fetch failed (fileId=${material.drive_file_id}):`,
        driveErr.message,
      );
      throw new HttpError(
        502,
        'DRIVE_ERROR',
        'Échec du téléchargement depuis Google Drive.',
      );
    }

    const safeName = (material.title || 'document')
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .slice(0, 100);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeName}.pdf"`,
    );

    stream.on('error', (err) => {
      console.error(
        `[materials.download] stream error (fileId=${material.drive_file_id}):`,
        err.message,
      );
      if (!res.headersSent) {
        next(
          new HttpError(
            502,
            'DRIVE_ERROR',
            'Erreur lors du téléchargement.',
          ),
        );
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, listForCourse, remove, download };
