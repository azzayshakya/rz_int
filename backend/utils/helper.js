/**
 * Helper utility functions
 * Contains reusable helper functions for the application
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { RAZORPAY, JWT } = require('./constants');

/**
 * Generate JWT token
 * @param {Object} payload - Data to be included in the token
 * @returns {String} JWT token
 */
exports.generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: JWT.EXPIRES_IN,
  });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded payload or null if invalid
 */
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Format amount for Razorpay (convert to paise)
 * @param {Number} amount - Amount in rupees
 * @returns {Number} Amount in paise
 */
exports.formatAmountForRazorpay = (amount) => {
  return Math.round(amount * 100);
};

/**
 * Convert amount from paise to rupees
 * @param {Number} amount - Amount in paise
 * @returns {Number} Amount in rupees
 */
exports.convertPaiseToRupees = (amount) => {
  return amount / 100;
};

/**
 * Verify Razorpay signature
 * @param {String} orderId - Razorpay order ID
 * @param {String} paymentId - Razorpay payment ID
 * @param {String} signature - Razorpay signature
 * @returns {Boolean} Whether signature is valid
 */
exports.verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  
  return generatedSignature === signature;
};

/**
 * Create error response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code
 * @param {Array|Object} errors - Additional error details
 * @returns {Object} Formatted error response
 */
exports.createErrorResponse = (message, statusCode, errors = null) => {
  return {
    success: false,
    message,
    statusCode,
    errors,
  };
};

/**
 * Create success response object
 * @param {String} message - Success message
 * @param {Object} data - Response data
 * @returns {Object} Formatted success response
 */
exports.createSuccessResponse = (message, data = null) => {
  return {
    success: true,
    message,
    data,
  };
};

/**
 * Generate receipt number
 * @returns {String} Unique receipt number
 */
exports.generateReceiptNumber = () => {
  return `RCPT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

/**
 * Generate order number
 * @returns {String} Unique order number
 */
exports.generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomPart}`;
};

/**
 * Format date to Indian standard format
 * @param {Date} date - Date to format
 * @returns {String} Formatted date string
 */
exports.formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format amount with currency symbol
 * @param {Number} amount - Amount to format
 * @param {String} currency - Currency code (default: INR)
 * @returns {String} Formatted amount with currency symbol
 */
exports.formatCurrency = (amount, currency = 'INR') => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

/**
 * Calculate total price of cart items
 * @param {Array} items - Array of cart items with price and quantity
 * @returns {Number} Total price
 */
exports.calculateItemsTotal = (items) => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

/**
 * Calculate tax amount based on subtotal
 * @param {Number} subtotal - Subtotal amount
 * @param {Number} taxRate - Tax rate as percentage (default: 18)
 * @returns {Number} Tax amount
 */
exports.calculateTax = (subtotal, taxRate = 18) => {
  return (subtotal * taxRate) / 100;
};

/**
 * Generate a random string
 * @param {Number} length - Length of the string
 * @returns {String} Random string
 */
exports.generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Parse webhook event data from Razorpay
 * @param {Object} webhookData - Raw webhook data
 * @returns {Object} Parsed webhook event
 */
exports.parseWebhookEvent = (webhookData) => {
  try {
    const event = webhookData.event;
    const payload = webhookData.payload.payment || webhookData.payload.refund || webhookData.payload.order;
    
    return {
      event,
      payload,
    };
  } catch (error) {
    console.error('Error parsing webhook event:', error);
    return null;
  }
};

/**
 * Create pagination object for response
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total number of items
 * @returns {Object} Pagination object
 */
exports.createPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};