// server/controllers/payment.controller.js
const { razorpayInstance, validatePaymentVerification } = require('../config/razorpay');
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const errorCodes = require('../config/errorCodes');
const { generateReceiptId } = require('../utils/helper');

/**
 * Create a new Razorpay order
 * @route POST /api/payments/create-order
 * @access Private
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', notes = {} } = req.body;
    
    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: 'Amount must be greater than 0',
      });
    }

    // Generate a unique receipt ID
    const receipt = generateReceiptId();
    
    // Create order in Razorpay
    const options = {
      amount: Math.round(amount * 100), // Convert to smallest currency unit (paise for INR)
      currency,
      receipt,
      notes: {
        ...notes,
        userId: req.user.id, // Assuming user is authenticated
      },
      payment_capture: 1, // Auto-capture payment
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    // Save order details to database
    const order = await Order.create({
      orderId: razorpayOrder.id,
      amount: amount,
      currency,
      receipt,
      userId: req.user.id,
      status: razorpayOrder.status,
      notes,
    });

    // Return success response with order details
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: amount,
        currency,
        receipt,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.ORDER_CREATION_FAILED,
      message: error.message || 'Failed to create order',
    });
  }
};

/**
 * Verify and capture payment
 * @route POST /api/payments/verify
 * @access Private
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: 'Missing required payment verification parameters',
      });
    }

    // Verify signature
    const isValid = validatePaymentVerification(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: errorCodes.PAYMENT_VERIFICATION_FAILED,
        message: 'Payment verification failed. Invalid signature.',
      });
    }

    // Fetch the payment details from Razorpay
    const paymentDetails = await razorpayInstance.payments.fetch(razorpay_payment_id);

    // Update order status in database
    const order = await Order.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { status: 'paid' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: errorCodes.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }

    // Create payment record
    const payment = await Payment.create({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      amount: paymentDetails.amount / 100, // Convert from smallest currency unit
      currency: paymentDetails.currency,
      status: paymentDetails.status,
      method: paymentDetails.method,
      userId: req.user.id,
      email: paymentDetails.email,
      contact: paymentDetails.contact,
      paymentDetails: paymentDetails,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: paymentDetails.amount / 100,
        currency: paymentDetails.currency,
        status: paymentDetails.status,
        method: paymentDetails.method,
        receipt: order.receipt,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.PAYMENT_VERIFICATION_FAILED,
      message: error.message || 'Failed to verify payment',
    });
  }
};

/**
 * Process refund
 * @route POST /api/payments/refund
 * @access Private
 */
exports.processRefund = async (req, res) => {
  try {
    const { paymentId, amount, notes = {} } = req.body;

    // Validate required fields
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: 'Payment ID is required for refund',
      });
    }

    // Fetch payment details from database
    const payment = await Payment.findOne({ paymentId });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: 'Payment not found',
      });
    }

    // Initialize refund options
    const refundOptions = {
      payment_id: paymentId,
      notes: {
        ...notes,
        userId: req.user.id,
      },
    };

    // If amount is specified, add it to options
    if (amount) {
      refundOptions.amount = Math.round(amount * 100); // Convert to smallest currency unit
    }

    // Process refund through Razorpay
    const refund = await razorpayInstance.payments.refund(refundOptions);

    // Update payment record with refund details
    payment.refunds.push(refund);
    payment.status = amount && amount < payment.amount ? 'partially_refunded' : 'refunded';
    await payment.save();

    // Update order status
    await Order.findOneAndUpdate(
      { orderId: payment.orderId },
      { status: payment.status },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        paymentId,
        amount: refund.amount / 100, // Convert from smallest currency unit
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.PAYMENT_REFUND_FAILED,
      message: error.message || 'Failed to process refund',
    });
  }
};

/**
 * Get payment details
 * @route GET /api/payments/:paymentId
 * @access Private
 */
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Fetch payment from database
    const payment = await Payment.findOne({ paymentId });

    if (!payment) {
      // Try to fetch from Razorpay
      try {
        const razorpayPayment = await razorpayInstance.payments.fetch(paymentId);
        
        return res.status(200).json({
          success: true,
          message: 'Payment details retrieved from Razorpay',
          data: {
            paymentId: razorpayPayment.id,
            orderId: razorpayPayment.order_id,
            amount: razorpayPayment.amount / 100, // Convert from smallest currency unit
            currency: razorpayPayment.currency,
            status: razorpayPayment.status,
            method: razorpayPayment.method,
            email: razorpayPayment.email,
            contact: razorpayPayment.contact,
            createdAt: razorpayPayment.created_at,
          },
        });
      } catch (razorpayError) {
        return res.status(404).json({
          success: false,
          error: errorCodes.VALIDATION_ERROR,
          message: 'Payment not found',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment details retrieved successfully',
      data: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        createdAt: payment.createdAt,
        refunds: payment.refunds,
      },
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || 'Failed to retrieve payment details',
    });
  }
};

/**
 * Generate receipt for payment
 * @route GET /api/payments/:paymentId/receipt
 * @access Private
 */
exports.generateReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Fetch payment from database
    const payment = await Payment.findOne({ paymentId }).populate('userId', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: 'Payment not found',
      });
    }

    // Fetch order details
    const order = await Order.findOne({ orderId: payment.orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: errorCodes.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }

    // Generate receipt data
    const receiptData = {
      receiptNumber: order.receipt,
      date: payment.createdAt,
      customerName: payment.userId?.name || 'Customer',
      customerEmail: payment.userId?.email || payment.email,
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.method,
    };

    return res.status(200).json({
      success: true,
      message: 'Receipt generated successfully',
      data: receiptData,
    });
  } catch (error) {
    console.error('Receipt generation error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || 'Failed to generate receipt',
    });
  }
};

/**
 * Webhook handler for Razorpay events
 * @route POST /api/payments/webhook
 * @access Public (secured by webhook secret)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Verify webhook signature
    const razorpaySignature = req.headers['x-razorpay-signature'];
    if (!razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay signature',
      });
    }

    // Verify signature (this logic can be moved to a middleware)
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    const event = req.body;

    // Handle different event types
    switch (event.event) {
      case 'payment.authorized':
        // Payment has been authorized but not captured yet
        console.log('Payment authorized:', event.payload.payment.entity.id);
        break;

      case 'payment.captured':
        // Payment has been captured
        await updatePaymentStatus(
          event.payload.payment.entity.id,
          event.payload.payment.entity.order_id,
          'captured'
        );
        break;

      case 'payment.failed':
        // Payment has failed
        await updatePaymentStatus(
          event.payload.payment.entity.id,
          event.payload.payment.entity.order_id,
          'failed'
        );
        break;

      case 'refund.created':
        // Refund has been initiated
        await updateRefundStatus(
          event.payload.refund.entity.id,
          event.payload.refund.entity.payment_id,
          'created'
        );
        break;

      case 'refund.processed':
        // Refund has been processed
        await updateRefundStatus(
          event.payload.refund.entity.id,
          event.payload.refund.entity.payment_id,
          'processed'
        );
        break;

      default:
        console.log('Unhandled event:', event.event);
    }

    // Acknowledge receipt of webhook
    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process webhook',
    });
  }
};

// Helper function to update payment status
async function updatePaymentStatus(paymentId, orderId, status) {
  try {
    // Update payment in database
    const payment = await Payment.findOneAndUpdate(
      { paymentId },
      { status },
      { new: true, upsert: true }
    );

    // Update order status
    if (orderId) {
      await Order.findOneAndUpdate(
        { orderId },
        { status: status === 'captured' ? 'paid' : status },
        { new: true }
      );
    }

    return payment;
  } catch (error) {
    console.error('Update payment status error:', error);
    throw error;
  }
}

// Helper function to update refund status
async function updateRefundStatus(refundId, paymentId, status) {
  try {
    // Find payment
    const payment = await Payment.findOne({ paymentId });
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Check if refund exists and update it
    const refundIndex = payment.refunds.findIndex(refund => refund.id === refundId);
    
    if (refundIndex !== -1) {
      payment.refunds[refundIndex].status = status;
    } else {
      // Fetch refund details from Razorpay
      const refundDetails = await razorpayInstance.refunds.fetch(refundId);
      payment.refunds.push(refundDetails);
    }

    // Update payment status based on refund
    if (status === 'processed') {
      const totalRefunded = payment.refunds.reduce(
        (sum, refund) => sum + (refund.amount || 0) / 100, 
        0
      );
      
      payment.status = totalRefunded >= payment.amount ? 'refunded' : 'partially_refunded';
      
      // Update order status
      await Order.findOneAndUpdate(
        { orderId: payment.orderId },
        { status: payment.status },
        { new: true }
      );
    }

    await payment.save();
    return payment;
  } catch (error) {
    console.error('Update refund status error:', error);
    throw error;
  }
}


/**
 * Get refund status
 * @route GET /api/payments/refund/:refundId
 * @access Private
 */
exports.getRefundStatus = async (req, res) => {
  try {
    const { refundId } = req.params;
    
    if (!refundId) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: 'Refund ID is required',
      });
    }
    
    // Fetch refund details from Razorpay
    const refundDetails = await razorpayInstance.refunds.fetch(refundId);
    
    // Find payment with this refund
    const payment = await Payment.findOne({ 'refunds.id': refundId });
    
    if (!payment) {
      return res.status(200).json({
        success: true,
        message: 'Refund details retrieved from Razorpay',
        data: {
          refundId: refundDetails.id,
          paymentId: refundDetails.payment_id,
          amount: refundDetails.amount / 100, // Convert from smallest currency unit
          status: refundDetails.status,
          createdAt: refundDetails.created_at,
        },
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Refund details retrieved successfully',
      data: {
        refundId: refundDetails.id,
        paymentId: refundDetails.payment_id,
        orderId: payment.orderId,
        amount: refundDetails.amount / 100, // Convert from smallest currency unit
        status: refundDetails.status,
        createdAt: refundDetails.created_at,
      },
    });
  } catch (error) {
    console.error('Get refund status error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || 'Failed to retrieve refund status',
    });
  }
};

/**
 * Get all payments for a user
 * @route GET /api/payments
 * @access Private
 */
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all payments for this user
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .select('-__v'); // Exclude version field
    
    return res.status(200).json({
      success: true,
      message: 'User payments retrieved successfully',
      count: payments.length,
      data: payments.map(payment => ({
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        createdAt: payment.createdAt,
        refunds: payment.refunds,
      })),
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || 'Failed to retrieve user payments',
    });
  }
};