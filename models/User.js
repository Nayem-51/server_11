const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    unique: true,
    sparse: true, // For Firebase UID
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    select: false,
    required: function () {
      // Require password for local accounts; Firebase accounts carry uid
      return !this.uid;
    },
  },
  photoURL: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: ["user", "instructor", "admin"],
    default: "user",
  },
  phone: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  premiumExpiry: {
    type: Date,
    default: null,
  },
  stripeCustomerId: {
    type: String,
    default: null,
  },
  enrolledLessons: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
