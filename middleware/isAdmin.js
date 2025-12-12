const User = require("../models/User");

module.exports = async function isAdmin(req, res, next) {
	try {
		// If role already present on request
		if (req.user && req.user.role === "admin") {
			return next();
		}

		// Try to load user from DB using _id or uid
		let userDoc = null;
		if (req.user?._id) {
			userDoc = await User.findById(req.user._id).select("role");
		} else if (req.user?.uid) {
			userDoc = await User.findOne({ uid: req.user.uid }).select("role");
		}

		if (userDoc && userDoc.role === "admin") {
			return next();
		}

		return res.status(403).json({
			success: false,
			message: "Forbidden: Admins only",
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: err.message });
	}
}
