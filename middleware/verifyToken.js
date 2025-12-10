const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

// Verify Bearer token (Firebase or JWT)
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify Firebase token first
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Fetch MongoDB _id for this Firebase UID
      let dbUser = await User.findOne({ uid: decodedToken.uid });
      
      // Fallback: If not found by UID, try by email (handle legacy/hybrid accounts)
      if (!dbUser && decodedToken.email) {
          dbUser = await User.findOne({ email: decodedToken.email });
      }
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        _id: dbUser ? dbUser._id : null
      };
      return next();
    } catch (firebaseError) {
      // If Firebase token fails, try JWT
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedToken;
      // In authController, we sign JWT with { uid: user._id }
      // So req.user.uid IS the _id here.
      if (req.user.uid) req.user._id = req.user.uid;
      
      return next();
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
};

module.exports = verifyToken;
