const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const updateAdminAvatar = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Use DiceBear Avatars API which has better CORS support
    // Or use Gravatar which is extremely reliable
    const newPhotoURL = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=4338ca';
    
    const result = await User.updateMany(
      { role: 'admin' },
      { 
        $set: { 
          photoURL: newPhotoURL
        } 
      }
    );

    console.log(`Updated ${result.modifiedCount} admin user(s)`);
    console.log('Admin avatar URL has been updated to:', newPhotoURL);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin avatar:', error);
    process.exit(1);
  }
};

updateAdminAvatar();
