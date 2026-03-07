const express = require("express");
const {
  quoteBooking,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  initiateBookingPayment,
  confirmBookingPayment,
} = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/quote", quoteBooking);
router.post("/", createBooking);
router.get("/me", getMyBookings);
router.get("/:id", getBookingById);
router.put("/:id/cancel", cancelBooking);
router.post("/:id/payments/initiate", initiateBookingPayment);
router.post("/:id/payments/confirm", confirmBookingPayment);

module.exports = router;
