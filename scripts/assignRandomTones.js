const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });
const Lesson = require("../models/Lesson");

const TONES = [
  "Motivational",
  "Sad",
  "Realization",
  "Gratitude",
  "Humorous",
  "Inspirational",
  "Balanced",
];

const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mbp6mif.mongodb.net/?appName=Cluster0`;

const randomizeTones = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✓ Connected");

    const lessons = await Lesson.find({});
    console.log(`Found ${lessons.length} lessons to update.`);

    let updatedCount = 0;
    for (const lesson of lessons) {
      const randomTone = TONES[Math.floor(Math.random() * TONES.length)];
      lesson.emotionalTone = randomTone;
      await lesson.save();
      updatedCount++;
      process.stdout.write(`\rUpdated ${updatedCount}/${lessons.length}`);
    }

    console.log("\n✓ All lessons updated with random tones.");
  } catch (err) {
    console.error("\n✗ Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  }
};

randomizeTones();
