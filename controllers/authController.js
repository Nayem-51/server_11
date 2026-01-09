const User = require("../models/User");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Register user
const register = async (req, res) => {
  try {
    const { email, displayName, password, photoURL, uid } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // For Firebase users trying to re-register, return existing user
      if (uid && existingUser.uid === uid) {
        // User matches, proceed to token generation
      } else if (uid && !existingUser.uid) {
        // Existing user via email, now linking Google/Firebase UID
        existingUser.uid = uid;
        if (photoURL && !existingUser.photoURL)
          existingUser.photoURL = photoURL;
        if (
          displayName &&
          (!existingUser.displayName || existingUser.displayName === "User")
        )
          existingUser.displayName = displayName;
        await existingUser.save();
      } else if (uid && existingUser.uid !== uid) {
        // Collision? Email exists but UID is different.
        // This might happen if user has two google accounts with same email? Unlikely.
        // Or if they are merging?
        // For safety, assume we update the user to the new UID if email is verified?
        // Let's just update it for now to handle re-installs or weird firebase cases.
        existingUser.uid = uid;
        await existingUser.save();
      }

      // Also sync photo/name aggressively for Google logins
      // User expects "gmail image" to show, so we sync it if provided.
      if (uid && existingUser.uid === uid) {
        let specificChange = false;
        if (photoURL && existingUser.photoURL !== photoURL) {
          existingUser.photoURL = photoURL;
          specificChange = true;
        }
        // Also sync display name if it's "User" or missing
        if (
          displayName &&
          (!existingUser.displayName || existingUser.displayName === "User")
        ) {
          existingUser.displayName = displayName;
          specificChange = true;
        }

        if (specificChange) await existingUser.save();
      }

      // Generate token
      const token = jwt.sign(
        { uid: existingUser._id, email: existingUser.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        success: true,
        message: "User logged in successfully",
        data: {
          user: {
            _id: existingUser._id,
            email: existingUser.email,
            displayName: existingUser.displayName,
            role: existingUser.role,
            photoURL: existingUser.photoURL,
            isPremium: existingUser.isPremium || false,
          },
          token,
        },
      });

      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Firebase user registration (no password required)
    if (uid) {
      const user = new User({
        uid,
        email,
        displayName: displayName || email.split("@")[0],
        photoURL,
        role: email === "nayem20talukdar@gmail.com" ? "admin" : "user",
      });

      await user.save();

      const token = jwt.sign(
        { uid: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            _id: user._id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            photoURL: user.photoURL,
            isPremium: user.isPremium || false,
          },
          token,
        },
      });
    }

    // Traditional email/password registration
    if (!email || !displayName || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, display name, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      displayName,
      password: hashedPassword,
      photoURL,
      role: email === "nayem20talukdar@gmail.com" ? "admin" : "user",
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { uid: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          _id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          photoURL: user.photoURL,
          isPremium: user.isPremium || false,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ email }).select(
      "+password +displayName +photoURL +role +email"
    );
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Force admin role for specific email if not already set
    if (user.email === "nayem20talukdar@gmail.com" && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          photoURL: user.photoURL,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// Firebase login/register
const firebaseAuth = async (req, res) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;

    // Check if user exists
    let user = await User.findOne({ uid });

    if (!user) {
      // Create new user
      user = new User({
        uid,
        email,
        displayName: displayName || email?.split("@")[0] || "User",
        photoURL,
        role: "user",
      });
      await user.save();
    } else {
      // Update existing user with latest Firebase info if available
      if (photoURL && user.photoURL !== photoURL) user.photoURL = photoURL;
      if (displayName && !user.displayName) user.displayName = displayName; // Only if missing, or maybe overwrite?
      // Let's overwrite displayName if it's "User" or just allow sync?
      // User might have customized it. Let's ONLY update if 'User' or missing.
      // Actually, user wants "gmail image" to show.
      // If user logs in with Google, we should probably rely on that unless user explicitly changed it in our app.
      // But we just implemented updateProfile.
      // Safe bet: Update photoURL if user.photoURL is empty.
      // The user COMPLAINED "does not show gmail image".
      // So we must ensure it shows.

      let changed = false;
      if (photoURL && !user.photoURL) {
        user.photoURL = photoURL;
        changed = true;
      }
      if (displayName && (!user.displayName || user.displayName === "User")) {
        user.displayName = displayName;
        changed = true;
      }

      if (changed) await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { uid: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Authentication successful",
      data: {
        user: {
          _id: user._id,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          photoURL: user.photoURL,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error with Firebase authentication",
      error: error.message,
    });
  }
};

// Logout (optional - mostly handled on client side)
const logout = async (req, res) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
};

// Get current authenticated user
const getCurrentUser = async (req, res) => {
  try {
    const identifier =
      req.user?.uid || req.user?._id || req.user?.id || req.user?.email;

    const queries = [];
    if (identifier) {
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        queries.push({ _id: identifier });
      }
      queries.push({ uid: identifier });
      queries.push({ email: identifier });
    }

    const user = await User.findOne(queries.length ? { $or: queries } : {});

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log(
      `✓ getCurrentUser - Email: ${user.email}, isPremium: ${user.isPremium}`
    );

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.displayName || user.name,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: user.role,
          isPremium: user.isPremium || false,
          totalLessons: user.totalLessons || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  firebaseAuth,
  logout,
  getCurrentUser,
};
