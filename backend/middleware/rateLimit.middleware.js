// server/middleware/rateLimit.middleware.js
const rateLimit = require('express-rate-limit');
const appConfig = require('../config/app');

/**
 * General API rate limiter to prevent abuse
 */
exports.apiLimiter = rateLimit({
  windowMs: appConfig.security.rateLimiting.windowMs,
  max: appConfig.security.rateLimiting.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      statusCode: 429
    }
  },
});

/**
 * More strict rate limiter for authentication routes
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later',
      statusCode: 429
    }
  },
});

/**
 * Rate limiter for payment creation to prevent payment spam
 */
exports.paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 payment attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many payment attempts, please try again later',
      statusCode: 429
    }
  },
});

/**
 * Webhook limiter to prevent webhook abuse
 */
exports.webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 webhook calls per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many webhook calls',
      statusCode: 429
    }
  },
});