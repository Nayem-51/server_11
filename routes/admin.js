const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');

// Admin routes - Protected by both verifyToken and isAdmin
router.get('/users', verifyToken, isAdmin, adminController.getAllUsers);
router.put('/users/:userId/role', verifyToken, isAdmin, adminController.changeUserRole);
router.put('/users/:userId/deactivate', verifyToken, isAdmin, adminController.deactivateUser);

router.get('/lessons', verifyToken, isAdmin, adminController.getAllLessonsAdmin);
router.put('/lessons/:lessonId/publish', verifyToken, isAdmin, adminController.toggleLessonPublish);
router.put('/lessons/:lessonId/feature', verifyToken, isAdmin, adminController.toggleLessonFeatured);

router.get('/reports', verifyToken, isAdmin, adminController.getAllReports);
router.put('/reports/:reportId/resolve', verifyToken, isAdmin, adminController.resolveReport);

router.get('/stats', verifyToken, isAdmin, adminController.getDashboardStats);

// Report lesson - any authenticated user can report
router.post('/lessons/:lessonId/report', verifyToken, adminController.reportLesson);

module.exports = router;
