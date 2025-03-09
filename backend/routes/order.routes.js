const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.Controller");
const authMiddleware = require("../middleware/auth.middleware");
const validationMiddleware = require("../middleware/validation.middleware");

// Create a new order
router.post(
  "/",
  authMiddleware.protect,
  // missing file
  validationMiddleware.validateOrderCreation,
  orderController.createOrder
);

// Get all orders for the logged-in user
router.get("/", authMiddleware.protect, orderController.getOrders);

// // Get a specific order by ID
router.get(
  "/:orderId",
  authMiddleware.protect,
  validationMiddleware.validateOrderId, // Ensure valid orderId format
  orderController.getOrderById
);

// // Update an order status (Admin only)
router.put(
  "/:orderId/status",
  authMiddleware.protect,
  authMiddleware.authorizeAdmin,
  validationMiddleware.validateOrderId,
  validationMiddleware.validateOrderStatusUpdate,
  orderController.updateOrderStatus
);

// // Cancel an order (Now using PATCH instead of POST)
router.patch(
  "/:orderId/cancel",
  authMiddleware.protect,
  validationMiddleware.validateOrderId,
  orderController.cancelOrder
);

module.exports = router;
