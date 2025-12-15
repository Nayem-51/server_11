const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const admin = require("firebase-admin");

// Initialize Firebase Admin from environment variable
let firebaseConfig;
try {
  const serviceKeyBase64 = process.env.FIREBASE_SERVICE_KEY;
  if (serviceKeyBase64) {
    const serviceKeyJson = Buffer.from(serviceKeyBase64, "base64").toString(
      "utf-8"
    );
    firebaseConfig = JSON.parse(serviceKeyJson);
  } else {
    // Fallback: try to load from JSON file if it exists
    firebaseConfig = require("./digitallifelessonsa11-firebase-adminsdk.json");
  }
} catch (err) {
  console.error("Firebase config error:", err.message);
  console.warn(
    "Firebase auth may not work. Check FIREBASE_SERVICE_KEY env variable."
  );
}

if (firebaseConfig) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
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
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Stripe webhook needs raw body, so mount it BEFORE express.json()
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" })
);

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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
