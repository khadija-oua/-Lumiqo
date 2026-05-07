const enrollmentsService = require('../services/enrollments.service');
const coursesService = require('../services/courses.service');
const { HttpError } = require('../utils/http-error');

async function enroll(req, res, next) {
  try {
    const { courseId } = req.body;

    const course = await coursesService.findById(courseId);
    if (!course) {
      throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
    }

    const already = await enrollmentsService.existsForStudentCourse(
      req.user.id,
      courseId,
    );
    if (already) {
      throw new HttpError(
        409,
        'ALREADY_ENROLLED',
        'Vous êtes déjà inscrit à ce cours.',
      );
    }

    const enrollment = await enrollmentsService.enroll(req.user.id, courseId);
    res.status(201).json({ enrollment });
  } catch (err) {
    // Race-condition fallback if two parallel requests both pass the existence check.
    if (err && err.code === 'ER_DUP_ENTRY') {
      return next(
        new HttpError(409, 'ALREADY_ENROLLED', 'Vous êtes déjà inscrit à ce cours.'),
      );
    }
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const courses = await enrollmentsService.listForStudent(req.user.id);
    res.json({ courses });
  } catch (err) {
    next(err);
  }
}

module.exports = { enroll, listMine };
