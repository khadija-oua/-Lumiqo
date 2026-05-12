const { Router } = require('express');

const authRoutes = require('./auth.routes');
const coursesRoutes = require('./courses.routes');
const enrollmentsRoutes = require('./enrollments.routes');
const adminRoutes = require('./admin.routes');
const materialsRoutes = require('./materials.routes');
const quizzesRoutes = require('./quizzes.routes');
const attemptsRoutes = require('./attempts.routes');
const chatRoutes = require('./chat.routes');
const varkRoutes = require('./vark.routes');
const learningPathsRoutes = require('./learningPaths.routes');
const { authLimiter } = require('../middleware/rate-limit');

const router = Router();

router.use('/auth', authLimiter, authRoutes);
router.use('/courses', coursesRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/admin', adminRoutes);
router.use('/materials', materialsRoutes);
router.use('/quizzes', quizzesRoutes);
router.use('/attempts', attemptsRoutes);
router.use('/chat', chatRoutes);
router.use('/vark', varkRoutes);
router.use('/learning-paths', learningPathsRoutes);

module.exports = router;
