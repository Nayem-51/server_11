const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const verifyToken = require("../middleware/verifyToken");
const isAdmin = require("../middleware/isAdmin");

// All admin routes require authentication and admin role
router.use(verifyToken, isAdmin);

// Dashboard stats
router.get("/stats", adminController.getStats);

// User management
router.get("/users", adminController.getUsers);
router.put("/users/:userId/role", adminController.changeUserRole);

// Lesson management
router.get("/lessons", adminController.getLessons);
router.delete("/lessons/:lessonId", adminController.deleteLesson);
router.put("/lessons/:lessonId/feature", adminController.toggleLessonFeature);
router.put("/lessons/:lessonId/review", adminController.markAsReviewed);

// Reported lessons
router.get("/reported-lessons", adminController.getReportedLessons);

module.exports = router;
