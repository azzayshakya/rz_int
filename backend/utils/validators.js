/**
 * Validators utility
 * Contains validation functions used by Zod schemas and other validation logic
 */
const { z } = require('zod');
const { ERROR_MESSAGES } = require('./constants');

// Email validation schema
exports.emailSchema = z
  .string()
  .email(ERROR_MESSAGES.VALIDATION_ERROR)
  .min(5, { message: 'Email must be at least 5 characters long' })
  .max(255, { message: 'Email must be less than 255 characters' });

// Password validation schema with strong password requirements
exports.passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(100, { message: 'Password must be less than 100 characters' })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  });

// Name validation schema
exports.nameSchema = z
  .string()
  .min(2, { message: 'Name must be at least 2 characters long' })
  .max(100, { message: 'Name must be less than 100 characters' })
  .regex(/^[a-zA-Z\s]+$/, { message: 'Name must contain only letters and spaces' });

// Phone number validation schema for Indian numbers
exports.phoneSchema = z
  .string()
  .regex(/^\d{10}$/, { message: 'Phone number must be 10 digits' });

// Address validation schema
exports.addressSchema = z.object({
  type: z.enum(['home', 'work', 'other']),
  street: z.string().min(3, { message: 'Street address is required' }),
  city: z.string().min(2, { message: 'City is required' }),
  state: z.string().min(2, { message: 'State is required' }),
  postalCode: z.string().regex(/^\d{6}$/, { message: 'Postal code must be 6 digits' }),
  country: z.string().default('India'),
  isDefault: z.boolean().optional().default(false),
});

// User registration schema
exports.registerSchema = z.object({
  name: exports.nameSchema,
  email: exports.emailSchema,
  password: exports.passwordSchema,
  phone: exports.phoneSchema.optional(),
});

// Login schema
exports.loginSchema = z.object({
  email: exports.emailSchema,
  password: z.string().min(1, { message: 'Password is required' }),
});

// Password reset request schema
exports.passwordResetRequestSchema = z.object({
  email: exports.emailSchema,
});

// Password reset schema
exports.passwordResetSchema = z.object({
  password: exports.passwordSchema,
  confirmPassword: z.string(),
  token: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Order item schema
exports.orderItemSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required' }),
  price: z.number().positive({ message: 'Price must be a positive number' }),
  quantity: z.number().int().positive({ message: 'Quantity must be a positive integer' }),
  productId: z.string().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
});

// Order creation schema
exports.orderCreationSchema = z.object({
  items: z.array(exports.orderItemSchema).min(1, { message: 'At least one item is required' }),
  shippingAddress: exports.addressSchema,
  billingAddress: exports.addressSchema.optional(),
  sameAsShipping: z.boolean().optional().default(true),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
});

// Order status update schema
exports.orderStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  notes: z.string().optional(),
});

// Payment order creation schema
exports.paymentOrderSchema = z.object({
  orderId: z.string({ message: 'Order ID is required' }),
  amount: z.number().positive({ message: 'Amount must be a positive number' }),
  currency: z.string().default('INR'),
  receipt: z.string().optional(),
  notes: z.record(z.string()).optional(),
});

// Payment verification schema
exports.paymentVerificationSchema = z.object({
  orderId: z.string({ message: 'Order ID is required' }),
  paymentId: z.string({ message: 'Payment ID is required' }),
  signature: z.string({ message: 'Signature is required' }),
});

// Refund request schema
exports.refundRequestSchema = z.object({
  paymentId: z.string({ message: 'Payment ID is required' }),
  amount: z.number().positive({ message: 'Amount must be a positive number' }).optional(),
  notes: z.string().optional(),
  refundAll: z.boolean().optional().default(true),
});

// UPI ID validation
exports.upiIdSchema = z.string().regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/, {
  message: 'Invalid UPI ID format',
});

// Credit card number validation (basic Luhn algorithm)
exports.isValidCreditCard = (cardNumber) => {
  // Remove spaces and dashes
  cardNumber = cardNumber.replace(/[\s-]/g, '');
  
  // Check if the number has only digits
  if (!/^\d+$/.test(cardNumber)) return false;
  
  // Check length (most cards are between 13-19 digits)
  if (cardNumber.length < 13 || cardNumber.length > 19) return false;
  
  // Luhn algorithm
  let sum = 0;
  let double = false;
  
  // Loop from right to left
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));
    
    // Double every second digit
    if (double) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    double = !double;
  }
  
  // If the sum is a multiple of 10, the number is valid
  return sum % 10 === 0;
};

// Credit card expiry validation (must be future date)
exports.isValidExpiryDate = (month, year) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
  const currentYear = now.getFullYear() % 100; // Get last two digits
  
  // Convert to numbers
  month = parseInt(month, 10);
  year = parseInt(year, 10);
  
  // Validate month and year
  if (month < 1 || month > 12) return false;
  
  // Check if the expiry date is in the past
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }
  
  return true;
};

// CVV validation (3-4 digits)
exports.isValidCVV = (cvv) => {
  return /^\d{3,4}$/.test(cvv);
};

// Razorpay webhook verification schema
exports.webhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({}).optional(),
    order: z.object({}).optional(),
    refund: z.object({}).optional(),
  }),
  created_at: z.number(),
});

// Validate pagination parameters
exports.validatePagination = (page, limit) => {
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  if (limit > 100) limit = 100;
  
  return { page, limit };
};

// Validate amount (should be positive and have maximum 2 decimal places)
exports.isValidAmount = (amount) => {
  if (amount <= 0) return false;
  
  // Check for maximum 2 decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
};

// Validate Razorpay payment ID format
exports.isValidRazorpayId = (id, type = 'payment') => {
  const patterns = {
    payment: /^pay_[a-zA-Z0-9]+$/,
    order: /^order_[a-zA-Z0-9]+$/,
    refund: /^rfnd_[a-zA-Z0-9]+$/,
    customer: /^cust_[a-zA-Z0-9]+$/,
  };
  
  return patterns[type] ? patterns[type].test(id) : false;
};