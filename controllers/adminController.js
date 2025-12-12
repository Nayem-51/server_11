const User = require("../models/User");
const Lesson = require("../models/Lesson");
const Report = require("../models/Report");

// Get admin dashboard stats
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalLessons = await Lesson.countDocuments();
    const publishedLessons = await Lesson.countDocuments({ isPublished: true });
    const flaggedLessons = await Lesson.countDocuments({ isFlagged: true });
    const totalReports = await Lesson.aggregate([
      { $group: { _id: null, total: { $sum: "$reportCount" } } },
    ]);

    const reportsCount = totalReports[0]?.total || 0;

    // Get top contributors (users with most lessons)
    const topContributors = await User.aggregate([
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "instructor",
          as: "lessons",
        },
      },
      { $addFields: { lessonCount: { $size: "$lessons" } } },
      { $match: { lessonCount: { $gt: 0 } } },
      { $sort: { lessonCount: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          displayName: 1,
          email: 1,
          photoURL: 1,
          lessonCount: 1,
        },
      },
    ]);

    // Get recent lessons
    const recentLessons = await Lesson.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("instructor", "displayName email");

    res.json({
      success: true,
      data: {
        totalUsers,
        totalLessons,
        publishedLessons,
        flaggedLessons,
        totalReports: reportsCount,
        topContributors,
        recentLessons,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching stats",
      error: error.message,
    });
  }
};

// Get all users for admin management
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select("-password")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();

    // Add lesson count for each user
    const usersWithLessonCount = await Promise.all(
      users.map(async (user) => {
        const lessonCount = await Lesson.countDocuments({
          instructor: user._id,
        });
        return {
          ...user.toObject(),
          lessonCount,
        };
      })
    );

    res.json({
      success: true,
      data: usersWithLessonCount,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// Change user role
const changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user role",
      error: error.message,
    });
  }
};

// Get all lessons for admin (including flagged/reported)
const getLessons = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, visibility, flagged } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (category) filter.category = category;
    if (visibility) filter.visibility = visibility;
    if (flagged === "true") filter.isFlagged = true;

    const lessons = await Lesson.find(filter)
      .populate("instructor", "displayName email photoURL")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Lesson.countDocuments(filter);

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
    res.status(500).json({
      success: false,
      message: "Error fetching lessons",
      error: error.message,
    });
  }
};

// Delete lesson (admin only)
const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findByIdAndDelete(lessonId);

    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }

    res.json({
      success: true,
      message: "Lesson deleted successfully",
      data: lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting lesson",
      error: error.message,
    });
  }
};

// Toggle lesson featured status
const toggleLessonFeature = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }

    lesson.isFeatured = !lesson.isFeatured;
    await lesson.save();

    res.json({
      success: true,
      message: `Lesson ${lesson.isFeatured ? "featured" : "unfeatured"}`,
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

// Get reported lessons (filter by flagged/reportCount)
const getReportedLessons = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reportedLessons = await Lesson.find({
      $or: [{ isFlagged: true }, { reportCount: { $gt: 0 } }],
    })
      .populate("instructor", "displayName email photoURL")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ reportCount: -1, updatedAt: -1 });

    const total = await Lesson.countDocuments({
      $or: [{ isFlagged: true }, { reportCount: { $gt: 0 } }],
    });

    res.json({
      success: true,
      data: reportedLessons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching reported lessons",
      error: error.message,
    });
  }
};

// Mark lesson as reviewed
const markAsReviewed = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findByIdAndUpdate(
      lessonId,
      { isReviewed: true, isFlagged: false },
      { new: true }
    );

    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }

    res.json({
      success: true,
      message: "Lesson marked as reviewed",
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

module.exports = {
  getStats,
  getUsers,
  changeUserRole,
  getLessons,
  deleteLesson,
  toggleLessonFeature,
  getReportedLessons,
  markAsReviewed,
};
