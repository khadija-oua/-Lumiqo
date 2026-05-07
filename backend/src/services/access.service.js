const coursesService = require('./courses.service');
const enrollmentsService = require('./enrollments.service');
const { HttpError } = require('../utils/http-error');

// Resolve the course at `courseId` and confirm `user` is allowed to read it.
// Read access = admin OR teacher who owns it OR enrolled student.
// Throws HttpError(404) if the course is missing, HttpError(403) if forbidden.
// Returns the course row on success.
async function ensureCourseReadAccess(user, courseId) {
  const course = await coursesService.findById(courseId);
  if (!course) {
    throw new HttpError(404, 'COURSE_NOT_FOUND', 'Cours introuvable.');
  }

  if (user.role === 'admin') return course;
  if (user.role === 'teacher' && course.teacher_id === user.id) return course;

  if (user.role === 'student') {
    const enrolled = await enrollmentsService.existsForStudentCourse(
      user.id,
      courseId,
    );
    if (enrolled) return course;
  }

  throw new HttpError(403, 'FORBIDDEN', 'Accès refusé.');
}

module.exports = { ensureCourseReadAccess };
