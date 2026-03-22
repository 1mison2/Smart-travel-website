const express = require("express");
const { getMyPayments } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/me", getMyPayments);

module.exports = router;
