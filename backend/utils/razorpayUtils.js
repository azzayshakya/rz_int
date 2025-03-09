const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('./logger');

// Initialize Razorpay with your key_id and key_secret
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a new Razorpay order
 * @param {Object} options Order options (amount, currency, receipt, notes)
 * @returns {Promise} Promise that resolves to the created order
 */
const createOrder = async (options) => {
  try {
    const order = await razorpay.orders.create(options);
    logger.info(`Razorpay order created: ${order.id}`);
    return order;
  } catch (error) {
    logger.error(`Error creating Razorpay order: ${error.message}`);
    throw error;
  }
};

/**
 * Verify Razorpay payment signature
 * @param {Object} options Object containing razorpay_order_id, razorpay_payment_id, razorpay_signature
 * @returns {Boolean} True if signature is valid, false otherwise
 */
const verifyPaymentSignature = (options) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = options;
    
    // Creating the HMAC string (order_id + "|" + payment_id)
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    
    // Compare the generated signature with the received signature
    const isAuthentic = generatedSignature === razorpay_signature;
    
    if (isAuthentic) {
      logger.info(`Payment verified successfully: ${razorpay_payment_id}`);
    } else {
      logger.warn(`Payment verification failed: ${razorpay_payment_id}`);
    }
    
    return isAuthentic;
  } catch (error) {
    logger.error(`Error verifying payment: ${error.message}`);
    return false;
  }
};

/**
 * Get payment details from Razorpay
 * @param {String} paymentId Razorpay payment ID
 * @returns {Promise} Promise that resolves to payment details
 */
const getPayment = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    logger.error(`Error fetching payment: ${error.message}`);
    throw error;
  }
};

/**
 * Capture an authorized payment
 * @param {String} paymentId Razorpay payment ID
 * @param {Number} amount Amount to capture (in paise)
 * @returns {Promise} Promise that resolves to captured payment
 */
const capturePayment = async (paymentId, amount) => {
  try {
    const payment = await razorpay.payments.capture(paymentId, amount);
    logger.info(`Payment captured successfully: ${paymentId}`);
    return payment;
  } catch (error) {
    logger.error(`Error capturing payment: ${error.message}`);
    throw error;
  }
};

/**
 * Process refund for a payment
 * @param {String} paymentId Razorpay payment ID
 * @param {Number} amount Amount to refund (in paise)
 * @param {Object} notes Additional notes for the refund
 * @returns {Promise} Promise that resolves to refund details
 */
const refundPayment = async (paymentId, amount, notes = {}) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount,
      notes,
    });
    logger.info(`Refund processed successfully: ${refund.id}`);
    return refund;
  } catch (error) {
    logger.error(`Error processing refund: ${error.message}`);
    throw error;
  }
};

/**
 * Generate receipt URL for a payment
 * @param {String} paymentId Razorpay payment ID
 * @returns {String} Receipt URL
 */
const generateReceiptUrl = (paymentId) => {
  return `https://rzp.io/i/receipt/${paymentId}`;
};

module.exports = {
  razorpay,
  createOrder,
  verifyPaymentSignature,
  getPayment,
  capturePayment,
  refundPayment,
  generateReceiptUrl,
};