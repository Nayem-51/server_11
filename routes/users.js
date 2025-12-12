const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const userController = require("../controllers/userController");

// Health check
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Users routes healthy" });
});

// Profile routes
router.get("/profile", verifyToken, userController.getProfile);
router.put("/profile", verifyToken, userController.updateProfile);

module.exports = router;
