const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const verifyToken = require('../middleware/verifyToken');

// Public routes
router.get('/', lessonController.getAllLessons);
router.get('/:id', lessonController.getLessonById);
router.get('/:id/comments', lessonController.getComments);

// Protected routes
router.post('/', verifyToken, lessonController.createLesson);
router.put('/:id', verifyToken, lessonController.updateLesson);
router.delete('/:id', verifyToken, lessonController.deleteLesson);
router.post('/:id/enroll', verifyToken, lessonController.enrollLesson);
router.post('/:id/comments', verifyToken, lessonController.addComment);

module.exports = router;
