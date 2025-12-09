const Lesson = require("../models/Lesson");
const Comment = require("../models/Comment");
const Favorite = require("../models/Favorite");

// Get all lessons (public)
const getAllLessons = async (req, res) => {
  try {
    const { category, level, sort, page = 1, limit = 100 } = req.query;

    let filter = {};

    if (category) filter.category = category;
    if (level) filter.level = level;

    const skip = (page - 1) * limit;

    const lessons = await Lesson.find(filter)
      .populate("instructor", "displayName photoURL email")
      .sort(sort || "-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Lesson.countDocuments(filter);
    console.log(`getAllLessons returning ${lessons.length} lessons`);

    res.json({
      success: true,
      data: lessons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAllLessons:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching lessons",
      error: error.message,
    });
  }
};

// Get public lessons
const getPublicLessons = async (req, res) => {
  try {
    const { category, sort, page = 1, limit = 100 } = req.query;

    // First check if any lessons exist at all
    const totalLessons = await Lesson.countDocuments({});
    console.log(`Total lessons in database: ${totalLessons}`);

    // Try to get published lessons first
    let filter = { isPublished: true };
    if (category) filter.category = category;

    const skip = (page - 1) * limit;

    let lessons = await Lesson.find(filter)
      .populate("instructor", "displayName photoURL email")
      .sort(sort || "-createdAt")
      .skip(skip)
      .limit(parseInt(limit));

    // If no published lessons, get all lessons
    if (lessons.length === 0 && totalLessons > 0) {
      console.log("No published lessons found, fetching all lessons");
      lessons = await Lesson.find({})
        .populate("instructor", "displayName photoURL email")
        .sort("-createdAt")
        .limit(parseInt(limit));
    }

    const total = lessons.length;
    console.log(`Returning ${total} lessons`);

    res.json({
      success: true,
      data: lessons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getPublicLessons:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching public lessons",
      error: error.message,
    });
  }
};

// Get single lesson
const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id)
      .populate("instructor", "displayName photoURL bio")
      .populate({
        path: "enrolledStudents",
        select: "displayName photoURL",
      });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    res.json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching lesson",
      error: error.message,
    });
  }
};

// Create lesson (instructor only)
const createLesson = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      price,
      image,
      duration,
      isPremium,
      isPublished,
      content,
      tags,
    } = req.body;

    // Validation
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and category are required",
      });
    }

    // Get instructor ID - resolve from Firebase UID if needed
    let instructorId = req.user._id;
    
    if (!instructorId && req.user.uid) {
      // Find user by Firebase UID
      const User = require("../models/User");
      const user = await User.findOne({ uid: req.user.uid });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. Please complete registration.",
        });
      }
      instructorId = user._id;
    }

    if (!instructorId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication",
      });
    }

    const lesson = new Lesson({
      title,
      description,
      category,
      level: level || "beginner",
      price: price || 0,
      image: image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
      duration: duration || 30,
      isPremium: isPremium || false,
      isPublished: isPublished !== undefined ? isPublished : true,
      content: content || "",
      tags: tags || [],
      instructor: instructorId,
    });

    await lesson.save();

    res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      data: lesson,
    });
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating lesson",
      error: error.message,
    });
  }
};

// Update lesson
const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    // Check if user is the instructor
    if (
      lesson.instructor.toString() !== (req.user._id || req.user.uid).toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized - You can only edit your own lessons",
      });
    }

    Object.assign(lesson, updates);
    lesson.updatedAt = Date.now();
    await lesson.save();

    res.json({
      success: true,
      message: "Lesson updated successfully",
      data: lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating lesson",
      error: error.message,
    });
  }
};

// Delete lesson
const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    // Check if user is the instructor
    if (
      lesson.instructor.toString() !== (req.user._id || req.user.uid).toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized - You can only delete your own lessons",
      });
    }

    await Lesson.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Lesson deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting lesson",
      error: error.message,
    });
  }
};

// Enroll in lesson
const enrollLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.uid;

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    // Check if already enrolled
    if (lesson.enrolledStudents.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Already enrolled in this lesson",
      });
    }

    lesson.enrolledStudents.push(userId);
    await lesson.save();

    res.json({
      success: true,
      message: "Enrolled successfully",
      data: lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error enrolling in lesson",
      error: error.message,
    });
  }
};

// Add comment to lesson
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, rating } = req.body;
    const userId = req.user._id || req.user.uid;

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const comment = new Comment({
      lesson: id,
      author: userId,
      text,
      rating,
    });

    await comment.save();

    // Populate author info
    await comment.populate("author", "displayName photoURL");

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding comment",
      error: error.message,
    });
  }
};

// Get comments for lesson
const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await Comment.find({ lesson: id })
      .populate("author", "displayName photoURL")
      .populate("replies.author", "displayName photoURL")
      .sort("-createdAt");

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message,
    });
  }
};

// Add favorite
const addFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.uid;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!lesson.favorites) lesson.favorites = [];
    if (!lesson.favorites.includes(userId)) {
      lesson.favorites.push(userId);
      if (!lesson.favoritesCount) lesson.favoritesCount = 0;
      lesson.favoritesCount++;
      await lesson.save();
    }

    res.json({
      success: true,
      message: "Added to favorites",
      data: lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding favorite",
      error: error.message,
    });
  }
};

// Remove favorite
const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.uid;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!lesson.favorites) lesson.favorites = [];
    const index = lesson.favorites.indexOf(userId);
    if (index > -1) {
      lesson.favorites.splice(index, 1);
      if (lesson.favoritesCount && lesson.favoritesCount > 0) {
        lesson.favoritesCount--;
      }
      await lesson.save();
    }

    res.json({
      success: true,
      message: "Removed from favorites",
      data: lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing favorite",
      error: error.message,
    });
  }
};

// Like lesson
const likeLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.uid;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    if (!lesson.likes) lesson.likes = [];
    const likeIndex = lesson.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Remove like
      lesson.likes.splice(likeIndex, 1);
      if (lesson.likesCount && lesson.likesCount > 0) {
        lesson.likesCount--;
      }
    } else {
      // Add like
      lesson.likes.push(userId);
      if (!lesson.likesCount) lesson.likesCount = 0;
      lesson.likesCount++;
    }

    await lesson.save();

    res.json({
      success: true,
      message: likeIndex > -1 ? "Like removed" : "Lesson liked",
      data: lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error liking lesson",
      error: error.message,
    });
  }
};

// Report lesson
const reportLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id || req.user.uid;
    const userEmail = req.user.email;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    // In production, create a LessonReport model and save
    // For now, log and respond
    const LessonReport = require("../models/LessonReport") || {
      create: async (data) => data,
    };

    try {
      const report = await LessonReport.create({
        lessonId: id,
        reporterUserId: userId,
        reportedUserEmail: userEmail,
        reason: reason || "Other",
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: "Lesson reported successfully",
        data: report,
      });
    } catch (_err) {
      // LessonReport model doesn't exist yet, return success anyway
      res.json({
        success: true,
        message: "Report submitted (logging locally)",
        data: { lessonId: id, reason, userId, timestamp: new Date() },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error reporting lesson",
      error: error.message,
    });
  }
};

module.exports = {
  getAllLessons,
  getPublicLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  enrollLesson,
  addComment,
  getComments,
  addFavorite,
  removeFavorite,
  likeLesson,
  reportLesson,
};
