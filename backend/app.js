require("dotenv").config(); // Load environment variables at the very top

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middleware/error.middleware");
const authRoutes = require("./routes/auth.routes");
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const logger = require("./utils/logger");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

connectDB(); // Now MONGODB_URI will be available

// Create Express app
const app = express();

// Body parser
app.use(express.json());

app.use(cookieParser());

// Enable CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", limiter);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Homepage route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Razorpay MERN API" });
});

// Error handler middleware
app.use(errorHandler);

module.exports = app;
