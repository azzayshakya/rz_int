const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const errorCodes = require("../config/errorCodes");

exports.createOrder = async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, shippingAddress } = req.body;

    if (!items || !totalAmount || !paymentMethod || !shippingAddress) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "All fields are required to create an order.",
      });
    }

    const newOrder = new Order({
      user: req.user.id,
      items,
      totalAmount,
      paymentMethod,
      shippingAddress,
      status: "pending", // Default status
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      message: "Order created successfully!",
      data: newOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "Failed to create order",
    });
  }
};

/**
 * Get all orders for the authenticated user
 * @route GET /api/orders
 * @access Private
 */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || "Failed to retrieve orders",
    });
  }
};

/**
 * Get order by ID
 * @route GET /api/orders/:orderId
 * @access Private
 */
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const validOrderId = mongoose.Types.ObjectId.isValid(orderId)
      ? new mongoose.Types.ObjectId(orderId)
      : null;

    if (!validOrderId) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({ _id: validOrderId, user: req.user.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: errorCodes.ORDER_NOT_FOUND,
        message: "Order not found",
      });
    }

    // Get associated payment if exists
    const payment = await Payment.findOne({ order: order._id });

    return res.status(200).json({
      success: true,
      data: {
        order,
        payment: payment || null,
      },
    });
  } catch (error) {
    console.error("Get order error:", error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || "Failed to retrieve order",
    });
  }
};

/**
 * Update order notes or metadata
 * @route PATCH /api/orders/:orderId
 * @access Private
 */
exports.updateOrderNotes = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes } = req.body;

    if (!notes || typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: "Notes must be a string",
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: errorCodes.ORDER_NOT_FOUND,
        message: "Order not found",
      });
    }

    // Update notes
    order.notes = notes;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order notes updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Update order notes error:", error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || "Failed to update order notes",
    });
  }
};

/**
 * Get order payment status
 * @route GET /api/orders/:orderId/status
 * @access Private
 */
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: errorCodes.ORDER_NOT_FOUND,
        message: "Order not found",
      });
    }

    const payment = await Payment.findOne({ order: order._id });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        status: order.status,
        paymentStatus: payment ? payment.status : "pending",
        paymentMethod: payment ? payment.method : null,
        amount: order.amount,
        currency: order.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get order status error:", error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || "Failed to retrieve order status",
    });
  }
};

/**
 * Cancel order (if not paid yet)
 * @route POST /api/orders/:orderId/cancel
 * @access Private
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: errorCodes.ORDER_NOT_FOUND,
        message: "Order not found",
      });
    }

    if (["paid", "refunded"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    order.status = "cancelled";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || "Failed to cancel order",
    });
  }
};

/**
 * Update order status (Admin only)
 * @route PUT /api/orders/:orderId/status
 * @access Admin
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: errorCodes.ORDER_NOT_FOUND,
        message: "Order not found"
      });
    }

    // Update order status
    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: error.message || "Failed to update order status"
    });
  }
};