const express = require("express");
const { initiatePayment, verifyPayment, getMyPayments } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/initiate", initiatePayment);
router.post("/verify", verifyPayment);
router.get("/me", getMyPayments);

module.exports = router;
