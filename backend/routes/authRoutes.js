const express = require("express");
const { register, login, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// allow both /signup and /register endpoints
router.post("/signup", register);
router.post("/register", register);
router.post("/login", login);

// forgot password and reset password endpoints
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// protected route to get current user
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
