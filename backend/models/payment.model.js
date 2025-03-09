// payment.model.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // ✅ Added index for faster lookups
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true, // ✅ Added index for performance
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR'],
    },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
    },
    method: {
      type: String,
      enum: ['card', 'netbanking', 'wallet', 'upi', 'emi', 'other'],
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true, // ✅ Indexing for faster queries
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
      required: function() { return this.status === 'captured'; }, // ✅ Required if payment is successful
    },
    card: {
      last4: String,
      network: String,
      type: String,
      issuer: String,
      international: Boolean,
      emi: Boolean,
    },
    upi: {
      vpa: String,
    },
    wallet: {
      name: String,
    },
    bank: {
      name: String,
    },
    emi: {
      provider: String,
      duration: Number,
    },
    recurring: {
      type: Boolean,
      default: false,
    },
    error: {
      code: String,
      description: String,
      source: String,
      step: String,
      reason: String,
    },
    notes: {
      type: Map,
      of: String,
    },
    refunds: [
      {
        razorpayRefundId: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'processed', 'failed'],
          default: 'pending',
        },
      },
    ],
    receipt: {
      type: String,
    },
    receiptSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.virtual('refundedAmount').get(function() {
  return this.refunds
    .filter(refund => refund.status === 'processed')
    .reduce((total, refund) => total + refund.amount, 0);
});

paymentSchema.methods.verifySignature = function(secret) {
  if (!this.razorpayPaymentId) return false;

  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(this.razorpayOrderId + '|' + this.razorpayPaymentId)
    .digest('hex');
  
  return generatedSignature === this.razorpaySignature;
};

paymentSchema.methods.updateFromRazorpay = async function(paymentData) {
  this.status = ['captured', 'authorized', 'refunded'].includes(paymentData.status) 
    ? paymentData.status 
    : 'failed';
  
  this.method = paymentData.method;
  this.razorpayPaymentId = paymentData.id;
  
  if (paymentData.card) {
    this.card = {
      last4: paymentData.card.last4,
      network: paymentData.card.network,
      type: paymentData.card.type,
      issuer: paymentData.card.issuer,
      international: paymentData.card.international,
      emi: paymentData.card.emi
    };
  }

  if (paymentData.vpa) {
    this.upi = { vpa: paymentData.vpa };
  }
  if (paymentData.wallet) {
    this.wallet = { name: paymentData.wallet };
  }
  if (paymentData.bank) {
    this.bank = { name: paymentData.bank };
  }

  if (paymentData.error_code) {
    this.error = {
      code: paymentData.error_code,
      description: paymentData.error_description,
      source: paymentData.error_source,
      step: paymentData.error_step,
      reason: paymentData.error_reason
    };
  }

  return this.save();
};

paymentSchema.methods.generateReceipt = async function() {
  if (!this.receipt) {
    this.receipt = 'RCPT-' + Date.now() + '-' + this._id.toString().slice(-6);
    await this.save();
  }
  return this.receipt;
};

paymentSchema.statics.findByOrder = function(orderId) {
  return this.find({ order: orderId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Payment', paymentSchema);
