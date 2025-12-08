const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');

// Protected routes
router.get('/profile', verifyToken, userController.getUserProfile);
router.put('/profile', verifyToken, userController.updateUserProfile);
router.post('/favorites', verifyToken, userController.addFavorite);
router.delete('/favorites/:lessonId', verifyToken, userController.removeFavorite);
router.get('/favorites', verifyToken, userController.getFavorites);
router.get('/enrolled', verifyToken, userController.getEnrolledLessons);

module.exports = router;
