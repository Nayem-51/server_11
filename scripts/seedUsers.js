const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config(); // Default looks in CWD (server_11)

const seedUsers = async () => {
  try {
    console.log("CWD:", process.cwd());
    const mongoUri =
      process.env.MONGODB_URI ||
      `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mbp6mif.mongodb.net/?appName=Cluster0`;

    console.log("Connecting to:", mongoUri.replace(/:([^:@]+)@/, ":****@")); // Hide password
    await mongoose.connect(mongoUri);
    console.log("✓ MongoDB connected for seeding");

    const password = "Nayem1234@";
    const hashedPassword = await bcrypt.hash(password, 10);

    const usersToSeed = [
      {
        email: "nayem20talukdar@gmail.com",
        displayName: "Nayem Admin",
        password: hashedPassword,
        role: "admin",
        photoURL: "https://lh3.googleusercontent.com/a/ACg8ocL0Q_y1y1y1y1y1y1y1y1y1y1y1=s96-c", // Placeholder or real if known
      },
      {
        email: "demo1234@gmail.com",
        displayName: "Demo User",
        password: hashedPassword,
        role: "user",
        photoURL: "https://ui-avatars.com/api/?name=Demo+User&background=random",
      },
    ];

    for (const userData of usersToSeed) {
      const user = await User.findOneAndUpdate(
        { email: userData.email },
        { ...userData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✓ Seeded user: ${user.email} (${user.role})`);
    }

    console.log("✓ User seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
