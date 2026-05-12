const learningPathsService = require('../services/learningPaths.service');
const accessService = require('../services/access.service');
const profilingAgent = require('../agents/profilingAgent');
const { HttpError } = require('../utils/http-error');

// POST /api/learning-paths/generate
// Creates a path. Fails with 409 if one already exists (use /refresh to overwrite).
async function generate(req, res, next) {
  try {
    const courseId = Number(req.body.courseId);
    if (!Number.isInteger(courseId) || courseId < 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'ID de cours invalide.');
    }
    // Enrolment check (admin/teacher fall through if they happen to be the
    // caller, but the route below restricts to student role).
    await accessService.ensureCourseReadAccess(req.user, courseId);

    const existing = await learningPathsService.findByStudentCourse(req.user.id, courseId);
    if (existing) {
      throw new HttpError(
        409,
        'PATH_EXISTS',
        "Un parcours d'apprentissage existe déjà pour ce cours. Utilisez /api/learning-paths/refresh pour le regénérer.",
      );
    }

    const path = await profilingAgent.generateLearningPath(req.user.id, courseId);
    res.status(201).json({ path });
  } catch (err) {
    next(err);
  }
}

// POST /api/learning-paths/refresh
// Always (re)generates a path.
async function refresh(req, res, next) {
  try {
    const courseId = Number(req.body.courseId);
    if (!Number.isInteger(courseId) || courseId < 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'ID de cours invalide.');
    }
    await accessService.ensureCourseReadAccess(req.user, courseId);

    const path = await profilingAgent.generateLearningPath(req.user.id, courseId);
    res.json({ path });
  } catch (err) {
    next(err);
  }
}

// GET /api/learning-paths/me?courseId=...
async function me(req, res, next) {
  try {
    const courseId = Number(req.query.courseId);
    if (!Number.isInteger(courseId) || courseId < 1) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Paramètre courseId requis et valide.');
    }
    await accessService.ensureCourseReadAccess(req.user, courseId);

    const path = await learningPathsService.findByStudentCourse(req.user.id, courseId);
    if (!path) {
      throw new HttpError(
        404,
        'PATH_NOT_FOUND',
        "Aucun parcours d'apprentissage n'existe encore pour ce cours.",
      );
    }
    res.json({ path });
  } catch (err) {
    next(err);
  }
}

module.exports = { generate, refresh, me };
