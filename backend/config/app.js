// server/config/app.js
const appConfig = {
    // Application settings
    name: 'Razorpay MERN Integration',
    version: '1.0.0',
    
    // Cors settings
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    
    // Payment settings
    payment: {
      currency: 'INR',
      receiptPrefix: 'order_rcptid_',
      defaultDescription: 'Payment for products/services',
      
      // Razorpay specific settings
      razorpay: {
        timeout: 300, // seconds
        retryCount: 3,
        webhook: {
          endpoint: '/api/payments/webhook',
          secret: process.env.RAZORPAY_WEBHOOK_SECRET
        },
        notes: {
          merchantInfo: 'Your Company Name',
          platform: 'MERN Stack Application'
        }
      }
    },
    
    // Security settings
    security: {
      rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      },
      helmet: true, // Enable security headers
    }
  };
  
  module.exports = appConfig;