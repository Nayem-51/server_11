const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });
const Lesson = require("../models/Lesson");

const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mbp6mif.mongodb.net/?appName=Cluster0`;

const verifyTones = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("✓ Connected");

    const lessons = await Lesson.find({});
    const counts = {};
    lessons.forEach(l => {
        counts[l.emotionalTone] = (counts[l.emotionalTone] || 0) + 1;
    });

    console.log("Tone Distribution:", counts);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

verifyTones();
