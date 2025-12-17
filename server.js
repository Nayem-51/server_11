const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const admin = require("firebase-admin");

// Initialize Firebase Admin from environment variable (base64 JSON) or local file
let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_KEY) {
    // Production / Deploy (Render, Vercel, Railway)
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_KEY,
      "base64"
    ).toString("utf8");

    serviceAccount = JSON.parse(decoded);
  } else {
    // Local development fallback
    serviceAccount = require("./digitallifelessonsa11-firebase-adminsdk.json");
  }
} catch (err) {
  console.error("Firebase config error:", err.message);
  console.warn(
    "Firebase Admin SDK not initialized. Check FIREBASE_SERVICE_KEY or local JSON file."
  );
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}


// Import routes
const authRoutes = require("./routes/auth");
const lessonRoutes = require("./routes/lessons");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const stripeRoutes = require("./routes/stripe");

const app = express();

// Middleware
// CORS configuration
// NOTE:
// - We are using JWT in Authorization headers (no cookies), so we don't need
//   credentials / cookies in CORS.
// - To avoid deployment mismatches and CORS failures, we allow all origins.
//   If you want to lock this down later, replace `origin: "*"` with an
//   explicit origin list.
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Stripe webhook needs raw body, so mount it BEFORE express.json()
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection using Mongoose
const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mbp6mif.mongodb.net/?appName=Cluster0`;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("✓ MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("✗ MongoDB connection error:", error.message);
  });

// Legacy MongoDB driver connection (optional, keep for compatibility)
const client = new MongoClient(mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✓ Legacy MongoDB client connected");
  } catch (error) {
    console.error("✗ Legacy MongoDB connection error:", error.message);
  }
}

run().catch(console.dir);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", require("./routes/categories"));
app.use("/api/stripe", stripeRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for serverless environments (Vercel) or testing
module.exports = app;
