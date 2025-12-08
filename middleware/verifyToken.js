const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

// Initialize Firebase Admin (if using Firebase Auth)
// Note: Make sure to initialize Firebase in your server.js

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify Firebase token first
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email
      };
      return next();
    } catch (firebaseError) {
      // If Firebase token fails, try JWT
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedToken;
      return next();
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

module.exports = verifyToken;
