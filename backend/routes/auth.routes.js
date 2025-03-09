const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validationMiddleware = require("../middleware/validation.middleware");

// console.log("authController:", authController);
// console.log("authMiddleware:", authMiddleware);

// User registration
router.post(
  "/register",
  validationMiddleware.validateRegistration,
  authController.register
);

// User login
router.post("/login", validationMiddleware.validateLogin, authController.login);

// Get current user profile
router.get("/profile", authMiddleware.protect, authController.getMe);

// Logout
router.post("/logout", authMiddleware.protect, authController.logout);

// Password reset request
// router.post(
//   "/forgot-password",
//   validationMiddleware.validateEmail,
//   authController.forgotPassword
// );

// // Reset password with token
// router.post(
//   "/reset-password/:token",
//   validationMiddleware.validatePasswordReset,
//   authController.resetPassword
// );

module.exports = router;
