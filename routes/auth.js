const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const verifyToken = require("../middleware/verifyToken");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/firebase-auth", authController.firebaseAuth);
router.post("/logout", authController.logout);

// Protected routes
router.get("/me", verifyToken, authController.getCurrentUser);

module.exports = router;
