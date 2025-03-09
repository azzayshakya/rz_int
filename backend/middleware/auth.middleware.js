// server/middleware/auth.middleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const errorCodes = require("../config/errorCodes");

/**
 * Middleware to protect routes that require authentication
 * Verifies JWT token and attaches the user to the request object
 */
exports.protect = async (req, res, next) => {
  console.log("protect route hitted")
  try {
    let token;

    // Check if token exists in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Extract token from Bearer token
      token = req.headers.authorization.split(" ")[1];
    }

    // Or get token from cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: errorCodes.AUTH_FAILED,
        message: "Not authorized to access this route",
      });
    }
    console.log("your token", token);
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded); // Debugging

      // Get user from database
      const user = await User.findById(decoded.id).select("-password");
      console.log("Authenticated User:", user); // Debugging

      // Check if user exists
      if (!user) {
        return res.status(401).json({
          success: false,
          error: errorCodes.AUTH_FAILED,
          message: "User no longer exists",
        });
      }

      // Attach user to request object
      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      console.error("Token Verification Error:", error.message); // Debugging
      return res.status(401).json({
        success: false,
        error: errorCodes.AUTH_FAILED,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Authentication Middleware Error:", error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: "Server error during authentication",
    });
  }
};

/**
 * Middleware to check user roles
 * Must be used after the protect middleware
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Not authorized to perform this action",
          statusCode: 403,
        },
      });
    }
    next();
  };
};

/**
 * Middleware to restrict access to admin users only
 * Must be used after the protect middleware
 */
exports.authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Admin access required to perform this action",
        statusCode: 403,
      },
    });
  }
  next();
};
