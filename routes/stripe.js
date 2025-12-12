const express = require("express");
const router = express.Router();

// Placeholder stripe routes to prevent app.use errors
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Stripe routes healthy" });
});

module.exports = router;
