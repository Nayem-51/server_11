const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const verifyToken = require('../middleware/verifyToken');

// Protected routes
router.post('/payment-intent', verifyToken, stripeController.createPaymentIntent);
router.post('/payment-success', verifyToken, stripeController.handlePaymentSuccess);
router.post('/subscription', verifyToken, stripeController.createSubscription);
router.post('/subscription/cancel', verifyToken, stripeController.cancelSubscription);

// Webhook - public (verify with Stripe signature in production)
router.post('/webhook', stripeController.handleWebhook);

module.exports = router;
