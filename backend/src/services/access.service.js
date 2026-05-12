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

// Returns true if `teacherId` owns at least one course in which `studentId`
// is enrolled. Used by GET /api/vark/student/:id to let a teacher view the
// VARK profile of a student they actually teach.
async function teacherHasStudent(teacherId, studentId) {
  const { pool } = require('../config/db');
  const [rows] = await pool.query(
    `SELECT 1
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = ?
        AND c.teacher_id = ?
      LIMIT 1`,
    [studentId, teacherId],
  );
  return rows.length > 0;
}

module.exports = { ensureCourseReadAccess, teacherHasStudent };
