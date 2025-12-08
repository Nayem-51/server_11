const Lesson = require('../models/Lesson');
const Comment = require('../models/Comment');
const Favorite = require('../models/Favorite');

// Get all lessons (public)
const getAllLessons = async (req, res) => {
  try {
    const { category, level, sort, page = 1, limit = 10 } = req.query;

    let filter = { isPublished: true };

    if (category) filter.category = category;
    if (level) filter.level = level;

    const skip = (page - 1) * limit;

    const lessons = await Lesson.find(filter)
      .populate('instructor', 'displayName photoURL')
      .sort(sort || '-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Lesson.countDocuments(filter);

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

// Get single lesson
const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id)
      .populate('instructor', 'displayName photoURL bio')
      .populate({
        path: 'enrolledStudents',
        select: 'displayName photoURL'
      });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    res.json({
      success: true,
      data: lesson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching lesson',
      error: error.message
    });
  }
};

// Create lesson (instructor only)
const createLesson = async (req, res) => {
  try {
    const { title, description, category, level, price, image, duration, isPremium, tags } = req.body;

    const lesson = new Lesson({
      title,
      description,
      category,
      level,
      price,
      image,
      duration,
      isPremium,
      tags,
      instructor: req.user._id || req.user.uid
    });

    await lesson.save();

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating lesson',
      error: error.message
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
        message: 'Lesson not found'
      });
    }

    // Check if user is the instructor
    if (lesson.instructor.toString() !== (req.user._id || req.user.uid).toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - You can only edit your own lessons'
      });
    }

    Object.assign(lesson, updates);
    lesson.updatedAt = Date.now();
    await lesson.save();

    res.json({
      success: true,
      message: 'Lesson updated successfully',
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

// Delete lesson
const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if user is the instructor
    if (lesson.instructor.toString() !== (req.user._id || req.user.uid).toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - You can only delete your own lessons'
      });
    }

    await Lesson.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting lesson',
      error: error.message
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
        message: 'Lesson not found'
      });
    }

    // Check if already enrolled
    if (lesson.enrolledStudents.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this lesson'
      });
    }

    lesson.enrolledStudents.push(userId);
    await lesson.save();

    res.json({
      success: true,
      message: 'Enrolled successfully',
      data: lesson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enrolling in lesson',
      error: error.message
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
        message: 'Lesson not found'
      });
    }

    const comment = new Comment({
      lesson: id,
      author: userId,
      text,
      rating
    });

    await comment.save();

    // Populate author info
    await comment.populate('author', 'displayName photoURL');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
};

// Get comments for lesson
const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await Comment.find({ lesson: id })
      .populate('author', 'displayName photoURL')
      .populate('replies.author', 'displayName photoURL')
      .sort('-createdAt');

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

module.exports = {
  getAllLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  enrollLesson,
  addComment,
  getComments
};
