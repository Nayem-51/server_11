const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Lesson = require('../models/Lesson');

// Create payment intent for lesson enrollment
const createPaymentIntent = async (req, res) => {
  try {
    const { lessonId, amount } = req.body;
    const userId = req.user._id || req.user.uid;

    // Validate lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Get or create Stripe customer
    let user = await User.findById(userId);
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: userId.toString() }
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        lessonId: lessonId.toString(),
        userId: userId.toString()
      }
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent',
      error: error.message
    });
  }
};

// Handle successful payment
const handlePaymentSuccess = async (req, res) => {
  try {
    const { paymentIntentId, lessonId } = req.body;
    const userId = req.user._id || req.user.uid;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful'
      });
    }

    // Update lesson enrollment
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    if (!lesson.enrolledStudents.includes(userId)) {
      lesson.enrolledStudents.push(userId);
      await lesson.save();
    }

    // Update user
    const user = await User.findById(userId);
    if (!user.enrolledLessons.includes(lessonId)) {
      user.enrolledLessons.push(lessonId);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Payment successful and enrollment completed',
      data: {
        enrollmentId: paymentIntentId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
};

// Create checkout session for one-time payment or subscription
const createCheckoutSession = async (req, res) => {
  try {
    const { price, currency, mode, successUrl, cancelUrl } = req.body;
    const userId = req.user._id || req.user.uid;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: userId.toString() }
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: currency || 'usd',
            product_data: {
              name: 'Premium Lifetime Access',
              description: 'Unlimited access to all lessons and features',
            },
            unit_amount: price * 100, // Amount in smallest currency unit
          },
          quantity: 1,
        },
      ],
      mode: mode || 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
      },
    });

    res.json({
      success: true,
      data: {
        sessionUrl: session.url,
        sessionId: session.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating checkout session',
      error: error.message
    });
  }
};

// Create subscription for premium membership
const createSubscription = async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.user._id || req.user.uid;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: userId.toString() }
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const subscription = await stripe.subscriptions.del(subscriptionId);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message
    });
  }
};

// Webhook to handle Stripe events
const handleWebhook = async (req, res) => {
  try {
    const event = req.body;

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Payment succeeded
        console.log('Payment succeeded:', event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Subscription updated
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          const isPremium = subscription.status === 'active' || subscription.status === 'trialing';
          await User.findByIdAndUpdate(userId, { 
            isPremium,
            premiumExpiry: new Date(subscription.current_period_end * 1000)
          });
          console.log(`User ${userId} premium status updated to ${isPremium}`);
        }
        break;

      case 'checkout.session.completed':
         const session = event.data.object;
         if (session.payment_status === 'paid') {
            const userId = session.metadata?.userId; // Assuming you passed this in metadata
            if (userId) {
                await User.findByIdAndUpdate(userId, { isPremium: true });
                console.log(`User ${userId} upgraded to premium via checkout`);
            } else {
                 // Try finding by email as fallback
                 const userEmail = session.customer_details?.email;
                 if (userEmail) {
                     await User.findOneAndUpdate({ email: userEmail }, { isPremium: true });
                 }
            }
         }
         break;

      case 'invoice.paid':
        // Invoice paid
        console.log('Invoice paid:', event.data.object);
        break;

      case 'invoice.payment_failed':
        // Payment failed
        console.log('Invoice payment failed:', event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Webhook error',
      error: error.message
    });
  }
};

module.exports = {
  createPaymentIntent,
  handlePaymentSuccess,
  createCheckoutSession,
  createSubscription,
  cancelSubscription,
  handleWebhook
};
