const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");

// Create Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Check if user is already premium
    if (user.isPremium) {
      return res.status(400).json({
        success: false,
        error: "User is already premium",
      });
    }

    console.log(`Creating checkout session for user: ${userId}`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      mode: "payment",
      locale: "en-US", // Use specific locale to prevent module loading errors
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: "Premium Plan (Lifetime)",
              description: "One-time payment for lifetime premium access",
            },
            unit_amount: 150000, // ৳1500 in paisa
          },
          quantity: 1,
        },
      ],
      success_url: `${
        process.env.CLIENT_URL ||
        process.env.SITE_DOMAIN ||
        "http://localhost:5173"
      }/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.CLIENT_URL ||
        process.env.SITE_DOMAIN ||
        "http://localhost:5173"
      }/payment/cancel`,
      metadata: {
        userId: userId.toString(),
      },
      client_reference_id: userId.toString(),
    });

    console.log(`✓ Checkout session created: ${session.id}`);

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe session creation error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create checkout session",
    });
  }
});

// Webhook endpoint to handle Stripe events
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log("🔔 Webhook received!");
    console.log("Headers:", req.headers);

    if (!webhookSecret) {
      console.error("❌ STRIPE_WEBHOOK_SECRET not configured");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log("✅ Webhook signature verified");
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📨 Received webhook event: ${event.type}`);

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log("💳 Processing checkout.session.completed");
      console.log("Session metadata:", session.metadata);
      console.log("Client reference ID:", session.client_reference_id);

      try {
        const userId = session.metadata?.userId || session.client_reference_id;

        if (!userId) {
          console.error("❌ No userId found in session metadata:", session);
          return res.status(400).json({ error: "No user ID in metadata" });
        }

        console.log(`🔍 Processing payment for user: ${userId}`);

        // Update user to premium
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            isPremium: true,
            stripeCustomerId: session.customer,
            updatedAt: new Date(),
          },
          { new: true }
        );

        if (!updatedUser) {
          console.error("❌ User not found:", userId);
          return res.status(404).json({ error: "User not found" });
        }

        console.log("✅ User upgraded to premium successfully!");
        console.log(`  📧 Email: ${updatedUser.email}`);
        console.log(`  ⭐ isPremium: ${updatedUser.isPremium}`);
        console.log(`  🔑 Stripe Customer: ${session.customer}`);
        console.log(`  🎫 Session ID: ${session.id}`);
      } catch (error) {
        console.error("❌ Error updating user to premium:", error);
        return res.status(500).json({ error: "Failed to update user" });
      }
    }

    res.json({ received: true });
  }
);

// Verify session and get payment status
router.get("/verify-session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      success: true,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      userId: session.metadata?.userId || session.client_reference_id,
    });
  } catch (error) {
    console.error("Session verification error:", error);
    res.status(500).json({ error: "Failed to verify session" });
  }
});

// Manual update endpoint for testing (REMOVE IN PRODUCTION)
router.post("/manual-upgrade/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`🔧 Manual upgrade requested for user: ${userId}`);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        isPremium: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Manual upgrade successful!");
    console.log(`  📧 Email: ${updatedUser.email}`);
    console.log(`  ⭐ isPremium: ${updatedUser.isPremium}`);

    res.json({
      success: true,
      message: "User upgraded to premium",
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        isPremium: updatedUser.isPremium,
      },
    });
  } catch (error) {
    console.error("Manual upgrade error:", error);
    res.status(500).json({ error: "Failed to upgrade user" });
  }
});

module.exports = router;
