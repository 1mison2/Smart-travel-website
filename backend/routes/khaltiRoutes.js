const express = require("express");
const { verifyKhaltiPayment, initiateKhaltiPayment } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/initiate-payment", protect, initiateKhaltiPayment);
router.post("/verify-payment", protect, verifyKhaltiPayment);

module.exports = router;
