const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR"],
    },
    tax: {
      type: Number,
      default: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    shippingAddress: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: "India",
      },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
    },
    razorpayOrderId: {
      type: String,
    },
    // If there are multiple payment attempts
    paymentAttempts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],
    // The successful payment
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    // If order is cancelled/refunded
    refund: {
      razorpayRefundId: {
        type: String,
      },
      amount: {
        type: Number,
      },
      status: {
        type: String,
        enum: ["pending", "processed", "failed"],
      },
      reason: {
        type: String,
      },
      processedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for calculating the final amount after discounts and taxes
orderSchema.virtual("finalAmount").get(function () {
  return Number(
    (this.totalAmount + this.tax + this.shippingFee - this.discount).toFixed(2)
  );
});

// Methods to update order status based on payment
orderSchema.methods.updateOrderAfterPayment = async function (
  payment,
  status = "processing"
) {
  this.payment = payment._id;
  this.paymentAttempts.push(payment._id);
  this.status = status;
  return this.save();
};

// Method to initiate refund
orderSchema.methods.initiateRefund = async function (razorpay, reason) {
  if (!this.payment || !this.razorpayOrderId) {
    throw new Error("Cannot refund order without a successful payment");
  }

  // Fetch the payment to get the payment ID
  const payment = await mongoose.model("Payment").findById(this.payment);

  if (!payment || !payment.razorpayPaymentId) {
    throw new Error("Cannot find valid payment details for refund");
  }

  try {
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: payment.amount * 100, // Convert from INR to paise
      notes: {
        reason: reason || "Customer requested refund",
        orderId: this._id.toString(),
      },
    });

    // Update the refund information
    this.refund = {
      razorpayRefundId: refund.id,
      amount: refund.amount / 100, // Convert from paise to INR
      status: "pending",
      reason: reason || "Customer requested refund",
      processedAt: new Date(),
    };

    this.status = "cancelled";
    return await this.save();
  } catch (error) {
    this.refund = this.refund || {};
    this.refund.status = "failed";
    throw new Error(`Refund failed: ${error.message}`);
  }
};

// Static method to find orders with pending payments
orderSchema.statics.findPendingPaymentOrders = function (userId) {
  return this.find({
    user: userId,
    payment: { $exists: false },
    status: "pending", // Ensures only pending orders are fetched
    createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("Order", orderSchema);
