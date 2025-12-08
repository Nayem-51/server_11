const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
    // Ensure verifyToken middleware has been called first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No user found'
      });
    }

    // Find user in database
    const user = await User.findOne({
      $or: [
        { uid: req.user.uid },
        { email: req.user.email }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - Admin access required'
      });
    }

    // Attach user to request
    req.user.dbUser = user;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking admin status',
      error: error.message
    });
  }
};

module.exports = isAdmin;
