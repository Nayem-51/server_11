const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Report = require('../models/Report');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;

    let matchStage = {};
    if (role) matchStage.role = role;

    const skip = (page - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await User.countDocuments(matchStage);

    // Aggregate to get users with lesson count
    const users = await User.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'lessons',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$instructor', '$$userId'] } } },
            { $project: { _id: 1 } } // optimize, only need id to count
          ],
          as: 'userLessons'
        }
      },
      {
        $addFields: {
          lessonsCount: { $size: '$userLessons' }
        }
      },
      {
        $project: {
          userLessons: 0,
          password: 0, 
          __v: 0
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Change user role
const changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role, updatedAt: Date.now() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message
    });
  }
};

// Deactivate user
const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating user',
      error: error.message
    });
  }
};

// Get all lessons (admin view)
const getAllLessonsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const lessons = await Lesson.find()
      .populate('instructor', 'displayName email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort('-createdAt');

    const total = await Lesson.countDocuments();

    res.json({
      success: true,
      data: lessons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching lessons',
      error: error.message
    });
  }
};

// Publish/Unpublish lesson
const toggleLessonPublish = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    lesson.isPublished = !lesson.isPublished;
    lesson.updatedAt = Date.now();
    await lesson.save();

    res.json({
      success: true,
      message: `Lesson ${lesson.isPublished ? 'published' : 'unpublished'} successfully`,
      data: lesson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating lesson',
      error: error.message
    });
  }
};

// Feature/Unfeature lesson
const toggleLessonFeatured = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Toggle logic: handle both isFeatured and featured (legacy) fields if needed
    // Assuming standardizing on isFeatured
    lesson.isFeatured = !lesson.isFeatured;
    lesson.updatedAt = Date.now();
    await lesson.save();

    res.json({
      success: true,
      message: `Lesson ${lesson.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: lesson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating lesson featured status',
      error: error.message
    });
  }
};

// Report lesson
const reportLesson = async (req, res) => {
  try {
    const userId = req.user._id || req.user.uid;
    const { lessonId } = req.params;
    const { reason, description } = req.body;

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const report = new Report({
      lesson: lessonId,
      reportedBy: userId,
      reason,
      description
    });

    await report.save();

    // Update Lesson stats
    lesson.reportCount = (lesson.reportCount || 0) + 1;
    lesson.isFlagged = true;
    await lesson.save();

    res.status(201).json({
      success: true,
      message: 'Lesson reported successfully',
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reporting lesson',
      error: error.message
    });
  }
};

// Get all reports (admin only)
const getAllReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const reports = await Report.find(filter)
      .populate('lesson', 'title')
      .populate('reportedBy', 'displayName email')
      .populate('resolvedBy', 'displayName')
      .skip(skip)
      .limit(parseInt(limit))
      .sort('-createdAt');

    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
};

// Resolve report
const resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.user._id || req.user.uid;

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        adminNotes,
        resolvedBy: adminId,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report resolved successfully',
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resolving report',
      error: error.message
    });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalLessons = await Lesson.countDocuments(); // All lessons
    const totalPublicLessons = await Lesson.countDocuments({ isPublished: true });
    
    // Count reported lessons (either by flag or having reports)
    const totalReportedLessons = await Lesson.countDocuments({
      $or: [{ isFlagged: true }, { reportCount: { $gt: 0 } }, { 'reports.0': { $exists: true } }]
    });

    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const totalPremiumUsers = await User.countDocuments({ isPremium: true });
    
    // Today's new lessons
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const newLessonsToday = await Lesson.countDocuments({ createdAt: { $gte: startOfDay } });

    // Most active contributors (Top 5)
    // We need to aggregate lessons by instructor
    const mostActiveContributors = await Lesson.aggregate([
      { $group: { _id: "$instructor", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { name: "$user.displayName", email: "$user.email", count: 1, photo: "$user.photoURL" } }
    ]);

    // Graph data: Lesson growth last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      
      const dayStart = new Date(d.setHours(0,0,0,0));
      const dayEnd = new Date(d.setHours(23,59,59,999));
      
      const count = await Lesson.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } });
      last7Days.push({ name: dateString, lessons: count });
    }

    // User growth last 7 days (optional but requested in graphs)
    const userGrowthLast7Days = []; 
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      
      const dayStart = new Date(d.setHours(0,0,0,0));
      const dayEnd = new Date(d.setHours(23,59,59,999));
      
      const count = await User.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } });
      userGrowthLast7Days.push({ name: dateString, users: count });
    }


    res.json({
      success: true,
      data: {
        totalUsers,
        totalLessons,
        totalPublicLessons,
        totalReportedLessons,
        totalInstructors,
        totalPremiumUsers,
        newLessonsToday,
        mostActiveContributors,
        graphData: {
          lessons: last7Days,
          users: userGrowthLast7Days
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  changeUserRole,
  deactivateUser,
  getAllLessonsAdmin,
  toggleLessonPublish,
  toggleLessonFeatured,
  reportLesson,
  getAllReports,
  resolveReport,
  getDashboardStats
};
