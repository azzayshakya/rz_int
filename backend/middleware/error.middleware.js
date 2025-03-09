// server/middleware/error.middleware.js
const errorCodes = require('../config/errorCodes');

/**
 * Custom error handler middleware
 * Formats errors in a consistent way
 */
exports.errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let errorResponse = {
    success: false,
    error: errorCodes.SERVER_ERROR,
    message: err.message || 'Server error',
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    errorResponse = {
      success: false,
      error: errorCodes.VALIDATION_ERROR,
      message: Object.values(err.errors).map(val => val.message).join(', '),
      fields: Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {}),
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    errorResponse = {
      success: false,
      error: errorCodes.VALIDATION_ERROR,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      fields: {
        [field]: `${field} already exists`,
      },
    };
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    errorResponse = {
      success: false,
      error: errorCodes.VALIDATION_ERROR,
      message: `Invalid ${err.path}: ${err.value}`,
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    errorResponse = {
      success: false,
      error: errorCodes.AUTH_FAILED,
      message: 'Invalid token',
    };
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse = {
      success: false,
      error: errorCodes.AUTH_FAILED,
      message: 'Token expired',
    };
  }

  // Razorpay errors
  if (err.error && err.error.code) {
    // Handle Razorpay API errors
    errorResponse = {
      success: false,
      error: {
        code: `RAZORPAY_${err.error.code}`,
        message: err.error.description || 'Payment gateway error',
        statusCode: 400,
      },
      message: err.error.description || 'Payment gateway error',
    };
  }

  // Set status code
  const statusCode = errorResponse.error.statusCode || 500;

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware to handle 404 errors
 */
exports.notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found - ${req.originalUrl}`,
      statusCode: 404,
    },
  });
};

/**
 * Async handler to remove try-catch blocks from route handlers
 */
exports.asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);