// payment.routes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.Controller");
const authMiddleware = require("../middleware/auth.middleware");
const validationMiddleware = require("../middleware/validation.middleware");

/**
 * Payment Routes for Razorpay Integration
 */

// Create a Razorpay order
router.post(
  "/create-order",
  authMiddleware.protect,
  validationMiddleware.validatePaymentOrder,
  paymentController.createOrder
);

// Verify payment after successful transaction (secured with auth)
router.post(
  "/verify",
  authMiddleware.protect,
  validationMiddleware.validatePaymentVerification,
  paymentController.verifyPayment
);

// Get payment details
router.get(
  "/:paymentId",
  authMiddleware.protect,
  paymentController.getPaymentDetails
);

// Generate receipt
router.get(
  "/:paymentId/receipt",
  authMiddleware.protect,
  paymentController.generateReceipt
);

// Process refund
// router.post(
//   "/:paymentId/refund",
//   authMiddleware.protect,
//   validationMiddleware.validateRefundRequest,
//   paymentController.processRefund
// );

// // Get refund status
// router.get(
//   "/refund/:refundId",
//   authMiddleware.protect,
//   paymentController.getRefundStatus
// );

// Get all payments
router.get("/", authMiddleware.protect, paymentController.getUserPayments);

// Webhook handler
router.post("/webhook", paymentController.handleWebhook);

module.exports = router;
