const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const verifyToken = require('../middleware/verifyToken');

// Public routes
router.get('/', lessonController.getAllLessons);
router.get('/public', lessonController.getPublicLessons);
router.get('/:id', lessonController.getLessonById);
router.get('/:id/comments', lessonController.getComments);

// Protected routes
router.post('/', verifyToken, lessonController.createLesson);
router.put('/:id', verifyToken, lessonController.updateLesson);
router.delete('/:id', verifyToken, lessonController.deleteLesson);
router.post('/:id/favorite', verifyToken, lessonController.addFavorite);
router.delete('/:id/favorite', verifyToken, lessonController.removeFavorite);
router.post('/:id/like', verifyToken, lessonController.likeLesson);
router.post('/:id/report', verifyToken, lessonController.reportLesson);
router.post('/:id/comments', verifyToken, lessonController.addComment);

module.exports = router;
