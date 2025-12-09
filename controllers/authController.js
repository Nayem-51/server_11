const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Register user
const register = async (req, res) => {
  try {
    const { email, displayName, password, photoURL } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user
    const user = new User({
      email,
      displayName,
      photoURL,
      role: 'user'
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { uid: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          photoURL: user.photoURL
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// Firebase login/register
const firebaseAuth = async (req, res) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;

    // Check if user exists
    let user = await User.findOne({ uid });

    if (!user) {
      // Create new user
      user = new User({
        uid,
        email,
        displayName,
        photoURL,
        role: 'user'
      });
      await user.save();
    }

    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          _id: user._id,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          photoURL: user.photoURL
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error with Firebase authentication',
      error: error.message
    });
  }
};

// Logout (optional - mostly handled on client side)
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

// Get current authenticated user
const getCurrentUser = async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.uid || req.user._id || req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.displayName || user.name,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: user.role,
          isPremium: user.isPremium || false,
          totalLessons: user.totalLessons || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  firebaseAuth,
  logout,
  getCurrentUser
};
