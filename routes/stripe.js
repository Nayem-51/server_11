const express = require("express");
const router = express.Router();
const stripeController = require("../controllers/stripeController");

// Create Checkout Session
router.post("/create-checkout-session", stripeController.createCheckoutSession);

// Webhook endpoint
// Note: express.raw middleware is applied in server.js for this specific route path
// but we just mount the controller handler here
router.post("/webhook", stripeController.handleWebhook);

// Verify session
router.get("/verify-session/:sessionId", stripeController.verifySession);

// Manual update endpoint for testing
router.post("/manual-upgrade/:userId", stripeController.manualUpgrade);

module.exports = router;