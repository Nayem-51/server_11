const express = require("express");
const router = express.Router();

// Placeholder user routes
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Users routes healthy" });
});

module.exports = router;
