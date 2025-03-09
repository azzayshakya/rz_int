const { z } = require("zod");
const errorCodes = require("../config/errorCodes");

/**
 * Middleware factory to validate request data using Zod schemas
 * @param {Object} schema - Zod schema for validation
 * @param {String} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
exports.validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      // Check if schema exists
      if (!schema) {
        console.error("Validation schema is undefined");
        return res.status(500).json({
          success: false,
          error: errorCodes.SERVER_ERROR,
          message: "Validation schema is missing",
        });
      }

      const result = schema.safeParse(req[source]);

      if (!result.success) {
        const formattedErrors = formatZodErrors(result.error);

        return res.status(400).json({
          success: false,
          error: errorCodes.VALIDATION_ERROR,
          message: "Validation failed",
          fields: formattedErrors.fields,
          errors: formattedErrors.errors,
        });
      }

      // Replace request data with validated data
      req[source] = result.data;
      next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      return res.status(500).json({
        success: false,
        error: errorCodes.SERVER_ERROR,
        message: "Validation error",
      });
    }
  };
};

/**
 * Format Zod errors into a more user-friendly structure
 * @param {Object} error - Zod error object
 * @returns {Object} Formatted errors
 */
function formatZodErrors(error) {
  const formattedErrors = {
    fields: {},
    errors: [],
  };

  for (const issue of error.issues) {
    const path = issue.path.join(".");

    // Add to fields object for easy access by field name
    formattedErrors.fields[path] = issue.message;

    // Add to errors array for a complete list
    formattedErrors.errors.push({
      field: path,
      message: issue.message,
      code: issue.code,
    });
  }

  return formattedErrors;
}

/**
 * Predefined Zod schemas for common validations
 */
exports.schemas = {
  // Auth schemas
  auth: {
    register: z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    }),

    login: z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password is required"),
    }),
  },

  // Payment schemas
  payment: {
    createOrder: z.object({
      amount: z.number().positive("Amount must be greater than 0"),
      currency: z.string().default("INR"),
      notes: z.record(z.string()).optional(),
      prefill: z
        .object({
          name: z.string().optional(),
          email: z.string().email("Invalid email").optional(),
          contact: z.string().optional(),
        })
        .optional(),
    }),

    verifyPayment: z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }),

    processRefund: z.object({
      paymentId: z.string(),
      amount: z.number().positive("Amount must be greater than 0").optional(),
      notes: z.record(z.string()).optional(),
    }),
  },

  // Order schemas
  order: {
    updateNotes: z.object({
      notes: z.record(z.string()),
    }),
    
    statusUpdate: z.enum(
      ["pending", "processing", "shipped", "delivered", "cancelled"],
      "Invalid order status"
    ),
    
    create: z.object({
      items: z
        .array(
          z.object({
            name: z.string().min(1, "Product name is required"), // Changed from productId to name
            quantity: z
              .number()
              .int()
              .positive("Quantity must be a positive integer"),
            price: z.number().positive("Price must be greater than 0"),
          })
        )
        .min(1, "At least one item is required"),
      totalAmount: z.number().positive("Total amount must be greater than 0"),
      paymentMethod: z.string().min(1, "Payment method is required"),
      shippingAddress: z.object({
        street: z.string().min(1, "Street is required"),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State is required"),
        zipCode: z.string().min(1, "Zip code is required"),
        country: z.string().min(1, "Country is required"),
      }),
    }),
  },

  // ID validation for route parameters
  idParam: z.object({
    id: z.string().min(1, "ID is required"),
  }),

  // Payment ID validation
  paymentIdParam: z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
  }),

  // Order ID validation
  orderIdParam: z.object({
    orderId: z.string().min(1, "Order ID is required"),
  }),
};

/**
 * Middleware to validate Razorpay webhook signature
 */
exports.validateWebhook = (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Check for Razorpay signature
    const razorpaySignature = req.headers["x-razorpay-signature"];
    if (!razorpaySignature) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: "Missing Razorpay signature",
      });
    }

    // Verify signature
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: "Invalid Razorpay signature",
      });
    }

    next();
  } catch (error) {
    console.error("Webhook validation error:", error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: "Webhook validation error",
    });
  }
};

// Validation middlewares - Define after all schemas
exports.validateRegistration = exports.validate(exports.schemas.auth.register);
exports.validateLogin = exports.validate(exports.schemas.auth.login);

// Fix for the order schemas
exports.validateOrderCreation = exports.validate(exports.schemas.order.create);
exports.validateOrderId = exports.validate(
  exports.schemas.orderIdParam,
  "params"
);
exports.validateOrderStatusUpdate = exports.validate(
  exports.schemas.order.statusUpdate
);

// Payment validation exports
exports.validatePaymentOrder = exports.validate(
  exports.schemas.payment.createOrder
);
exports.validatePaymentVerification = exports.validate(
  exports.schemas.payment.verifyPayment
);
exports.validateRefundRequest = exports.validate(
  exports.schemas.payment.processRefund,
  "body"
);
