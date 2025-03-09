/**
 * Application constants
 * Contains all the constant values used throughout the application
 */

// HTTP Status codes
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  };
  
  // Error messages
  exports.ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_NOT_FOUND: 'User not found',
    EMAIL_ALREADY_EXISTS: 'Email is already registered',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    SERVER_ERROR: 'Something went wrong, please try again later',
    VALIDATION_ERROR: 'Validation error',
    ORDER_NOT_FOUND: 'Order not found',
    PAYMENT_NOT_FOUND: 'Payment not found',
    INVALID_SIGNATURE: 'Invalid signature',
    PAYMENT_VERIFICATION_FAILED: 'Payment verification failed',
    RAZORPAY_ERROR: 'Error communicating with payment gateway',
    INSUFFICIENT_PAYMENT: 'Payment amount does not match order amount',
    REFUND_FAILED: 'Refund could not be processed',
  };
  
  // Success messages
  exports.SUCCESS_MESSAGES = {
    USER_REGISTERED: 'User registered successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_RESET: 'Password reset successful',
    PASSWORD_RESET_EMAIL: 'Password reset email sent',
    ORDER_CREATED: 'Order created successfully',
    PAYMENT_VERIFIED: 'Payment verified successfully',
    REFUND_INITIATED: 'Refund initiated successfully',
    RECEIPT_GENERATED: 'Receipt generated successfully',
  };
  
  // Razorpay related constants
  exports.RAZORPAY = {
    CURRENCY: 'INR',
    PAYMENT_CAPTURE: 1, // Auto capture payments
    WEBHOOK_EVENTS: {
      PAYMENT_AUTHORIZED: 'payment.authorized',
      PAYMENT_CAPTURED: 'payment.captured',
      PAYMENT_FAILED: 'payment.failed',
      REFUND_PROCESSED: 'refund.processed',
      REFUND_CREATED: 'refund.created',
      REFUND_FAILED: 'refund.failed',
      ORDER_PAID: 'order.paid',
    },
    PAYMENT_METHODS: {
      CARD: 'card',
      NETBANKING: 'netbanking',
      WALLET: 'wallet',
      UPI: 'upi',
      EMI: 'emi',
    },
    PAYMENT_STATUS: {
      CREATED: 'created',
      AUTHORIZED: 'authorized',
      CAPTURED: 'captured',
      FAILED: 'failed',
      REFUNDED: 'refunded',
    },
    REFUND_STATUS: {
      PENDING: 'pending',
      PROCESSED: 'processed',
      FAILED: 'failed',
    },
  };
  
  // Order related constants
  exports.ORDER = {
    STATUS: {
      PENDING: 'pending',
      PROCESSING: 'processing',
      SHIPPED: 'shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
      REFUNDED: 'refunded',
    },
    PAYMENT_STATUS: {
      PENDING: 'pending',
      INITIATED: 'initiated',
      AUTHORIZED: 'authorized',
      CAPTURED: 'captured',
      FAILED: 'failed',
      REFUNDED: 'refunded',
      PARTIALLY_REFUNDED: 'partially_refunded',
    },
  };
  
  // User related constants
  exports.USER = {
    ROLES: {
      USER: 'user',
      ADMIN: 'admin',
    },
    ADDRESS_TYPES: {
      HOME: 'home',
      WORK: 'work',
      OTHER: 'other',
    },
    PAYMENT_METHOD_TYPES: {
      CARD: 'card',
      UPI: 'upi',
    },
  };
  
  // Pagination defaults
  exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  };
  
  // JWT related constants
  exports.JWT = {
    EXPIRES_IN: '7d',
    COOKIE_EXPIRES_IN: 7, // days
  };
  
  // Email templates
  exports.EMAIL_TEMPLATES = {
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password-reset',
    ORDER_CONFIRMATION: 'order-confirmation',
    PAYMENT_SUCCESS: 'payment-success',
    PAYMENT_FAILED: 'payment-failed',
    SHIPPING_CONFIRMATION: 'shipping-confirmation',
    DELIVERY_CONFIRMATION: 'delivery-confirmation',
    REFUND_CONFIRMATION: 'refund-confirmation',
  };