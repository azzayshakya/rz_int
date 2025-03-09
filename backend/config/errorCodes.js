// server/config/errorCodes.js
const errorCodes = {
    // Authentication errors
    AUTH_FAILED: {
      code: 'AUTH_FAILED',
      message: 'Authentication failed',
      statusCode: 401
    },
    
    // Payment errors
    PAYMENT_CREATION_FAILED: {
      code: 'PAYMENT_CREATION_FAILED',
      message: 'Failed to create payment',
      statusCode: 400
    },
    PAYMENT_VERIFICATION_FAILED: {
      code: 'PAYMENT_VERIFICATION_FAILED',
      message: 'Payment verification failed',
      statusCode: 400
    },
    PAYMENT_CAPTURE_FAILED: {
      code: 'PAYMENT_CAPTURE_FAILED',
      message: 'Failed to capture payment',
      statusCode: 400
    },
    PAYMENT_REFUND_FAILED: {
      code: 'PAYMENT_REFUND_FAILED',
      message: 'Failed to process refund',
      statusCode: 400
    },
    
    // Order errors
    ORDER_CREATION_FAILED: {
      code: 'ORDER_CREATION_FAILED',
      message: 'Failed to create order',
      statusCode: 400
    },
    ORDER_NOT_FOUND: {
      code: 'ORDER_NOT_FOUND',
      message: 'Order not found',
      statusCode: 404
    },
    
    // General errors
    VALIDATION_ERROR: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      statusCode: 400
    },
    SERVER_ERROR: {
      code: 'SERVER_ERROR',
      message: 'Internal server error',
      statusCode: 500
    }
  };
  
  module.exports = errorCodes;