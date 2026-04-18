const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token is required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenUserId = String(decoded?.sub || decoded?.id || "").trim();
    const headerUserId = String(req.headers["x-user-id"] || "").trim();
    const headerEmail = String(req.headers["x-user-email"] || "").trim().toLowerCase();

    if (!tokenUserId) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    const lookup = [
      { externalRef: tokenUserId },
      ...(headerUserId ? [{ externalRef: headerUserId }, { uniqueId: headerUserId }] : []),
      ...(headerEmail ? [{ email: headerEmail }] : []),
    ];

    if (mongoose.Types.ObjectId.isValid(tokenUserId)) {
      lookup.unshift({ _id: tokenUserId });
    }

    const user = await User.findOne({ $or: lookup });

    if (!user) {
      return res.status(401).json({
        message: "Invalid token user",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "User account is inactive",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not allowed to access this resource",
      });
    }

    next();
  };
}

module.exports = {
  protect,
  authorizeRoles,
};
