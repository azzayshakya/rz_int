// server/controllers/auth.controller.js
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const errorCodes = require('../config/errorCodes');

/**
 * Generate JWT Token and set it in HTTP-only cookie
 */
const generateTokenResponse = (user, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  // Convert JWT_COOKIE_EXPIRE to a number and ensure it's valid
  const cookieExpireDays = Number(process.env.JWT_COOKIE_EXPIRE) || 7;

  // Set token in an HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
  });

  return token;
};


/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    if (await User.findOne({ email })) {
      return res.status(400).json({
        success: false,
        error: errorCodes.VALIDATION_ERROR,
        message: 'User already exists with this email',
      });
    }

    // Create user (password hashing handled in the model pre-save hook)
    const user = await User.create({ name, email, password });

    // Generate token and set cookie
    const token = generateTokenResponse(user, res);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: 'Failed to register user',
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        error: errorCodes.AUTH_FAILED,
        message: 'Invalid email or password',
      });
    }

    // Generate token and set cookie
    const token = generateTokenResponse(user, res);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: 'Failed to login',
    });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: errorCodes.AUTH_FAILED,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: errorCodes.SERVER_ERROR,
      message: 'Failed to get profile',
    });
  }
};
