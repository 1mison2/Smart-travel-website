const express = require("express");
const {
  quoteBooking,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
} = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/quote", quoteBooking);
router.post("/", createBooking);
router.get("/me", getMyBookings);
router.get("/:id", getBookingById);
router.put("/:id/cancel", cancelBooking);
module.exports = router;
