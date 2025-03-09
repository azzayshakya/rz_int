const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        'Please provide a valid email',
      ],
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password in queries
    },
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return /\d{10}/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      }
    },
    addresses: [
      {
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
          default: 'India',
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    paymentMethods: [
      {
        type: {
          type: String,
          enum: ['card', 'upi', 'netbanking', 'wallet'],
          required: true,
        },
        // For cards - store token, not actual card details
        token: {
          type: String,
        },
        // For cards - last 4 digits for display purposes only
        last4: {
          type: String,
        },
        // For UPI - VPA (Virtual Payment Address)
        vpa: {
          type: String,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    razorpayCustomerId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

// Create Razorpay customer if not exists
userSchema.methods.ensureRazorpayCustomer = async function (razorpay) {
  if (this.razorpayCustomerId) return this.razorpayCustomerId;

  try {
    const customer = await razorpay.customers.create({
      name: this.name,
      email: this.email,
      contact: this.phone,
    });

    this.razorpayCustomerId = customer.id;
    await this.save();
    
    return customer.id;
  } catch (error) {
    throw new Error(`Failed to create Razorpay customer: ${error.message}`);
  }
};

module.exports = mongoose.model('User', userSchema);