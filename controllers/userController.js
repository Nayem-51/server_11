const mongoose = require("mongoose");
const User = require("../models/User");

// Fetch the authenticated user's profile
const getProfile = async (req, res) => {
  try {
    const identifier =
      req.user?.uid || req.user?._id || req.user?.id || req.user?.email;

    const queries = [];
    if (identifier) {
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        queries.push({ _id: identifier });
      }
      queries.push({ uid: identifier });
      queries.push({ email: identifier });
    }

    const user = await User.findOne(queries.length ? { $or: queries } : {});

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
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
          totalLessons: user.totalLessons || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

// Update the authenticated user's profile
const updateProfile = async (req, res) => {
  try {
    const identifier =
      req.user?.uid || req.user?._id || req.user?.id || req.user?.email;

    const queries = [];
    if (identifier) {
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        queries.push({ _id: identifier });
      }
      queries.push({ uid: identifier });
      queries.push({ email: identifier });
    }

    const user = await User.findOne(queries.length ? { $or: queries } : {});

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { displayName, photoURL } = req.body;

    if (displayName) {
      user.displayName = displayName;
    }

    if (typeof photoURL === "string") {
      user.photoURL = photoURL;
    }

    user.updatedAt = new Date();
    await user.save();

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
          totalLessons: user.totalLessons || 0,
        },
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
