const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Favorite = require('../models/Favorite');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.uid;

    const user = await User.findById(userId)
      .populate('enrolledLessons', 'title image price');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.uid;
    const { displayName, bio, phone, photoURL } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        displayName,
        bio,
        phone,
        photoURL,
        updatedAt: Date.now()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Add favorite lesson
const addFavorite = async (req, res) => {
  try {
    const userId = req.user._id || req.user.uid;
    const { lessonId } = req.body;

    // Check if lesson exists
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ user: userId, lesson: lessonId });
    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Already in favorites'
      });
    }

    const favorite = new Favorite({ user: userId, lesson: lessonId });
    await favorite.save();

    res.status(201).json({
      success: true,
      message: 'Added to favorites',
      data: favorite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding favorite',
      error: error.message
    });
  }
};

// Remove favorite
const removeFavorite = async (req, res) => {
  try {
    const userId = req.user._id || req.user.uid;
    const { lessonId } = req.params;

    const result = await Favorite.findOneAndDelete({ user: userId, lesson: lessonId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    res.json({
      success: true,
      message: 'Removed from favorites'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing favorite',
      error: error.message
    });
  }
};

// Get user favorites
const getFavorites = async (req, res) => {
  try {
    const userId = req.user._id || req.user.uid;

    const favorites = await Favorite.find({ user: userId })
      .populate({
        path: 'lesson',
        select: 'title image price category level instructor',
        populate: { path: 'instructor', select: 'displayName' }
      });

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching favorites',
      error: error.message
    });
  }
};

// Get enrolled lessons
const getEnrolledLessons = async (req, res) => {
  try {
    const userId = req.user._id || req.user.uid;

    const user = await User.findById(userId).populate('enrolledLessons');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.enrolledLessons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrolled lessons',
      error: error.message
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  addFavorite,
  removeFavorite,
  getFavorites,
  getEnrolledLessons
};
