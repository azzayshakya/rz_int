// server/config/razorpay.js
const Razorpay = require('razorpay');

// Initialize Razorpay with your key_id and key_secret
// These should be stored in environment variables
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Function to validate Razorpay signature
const validatePaymentVerification = (orderId, paymentId, signature) => {
  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
    
  return generatedSignature === signature;
};

module.exports = {
  razorpayInstance,
  validatePaymentVerification
};