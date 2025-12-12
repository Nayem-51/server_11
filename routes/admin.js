const express = require("express");
const router = express.Router();

// Placeholder admin routes to prevent app.use errors
// Add real implementations in controllers as needed.
router.get("/health", (req, res) => {
	res.json({ success: true, message: "Admin routes healthy" });
});

module.exports = router;
