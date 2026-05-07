const { Router } = require('express');

const authRoutes = require('./auth.routes');
const coursesRoutes = require('./courses.routes');
const enrollmentsRoutes = require('./enrollments.routes');
const adminRoutes = require('./admin.routes');
const materialsRoutes = require('./materials.routes');
const { authLimiter } = require('../middleware/rate-limit');

const router = Router();

router.use('/auth', authLimiter, authRoutes);
router.use('/courses', coursesRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/admin', adminRoutes);
router.use('/materials', materialsRoutes);

module.exports = router;
