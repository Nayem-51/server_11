const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner",
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  price: {
    type: Number,
    default: 0,
  },
  image: {
    type: String,
    default:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
  },
  videoUrl: {
    type: String,
    default: null,
  },
  duration: {
    type: Number, // in minutes
    default: 30,
  },
  content: {
    type: String, // Detailed lesson content
    default: null,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  enrolledStudents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isPremium: {
    type: Boolean,
    default: false,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  tags: [String],
  emotionalTone: {
    type: String,
    default: "Balanced",
  },
  favoritesCount: {
    type: Number,
    default: 0,
  },
  isFlagged: {
    type: Boolean,
    default: false,
  },
  reportCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Lesson", lessonSchema);
