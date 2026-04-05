const express = require("express");
const {
  getAdminStats,
  getAllUsers,
  toggleBlockUser,
  deleteUser,
  createLocation,
  getAllLocations,
  updateLocation,
  deleteLocation,
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
  getAllPosts,
  updatePostStatus,
  approvePost,
  deletePost,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  sendAnnouncementEmailToUsers,
  sendUpcomingTripReminders,
} = require("../controllers/adminController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get("/stats", getAdminStats);

router.get("/users", getAllUsers);
router.put("/users/:id/block", toggleBlockUser);
router.delete("/users/:id", deleteUser);

router.post(
  "/locations",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 12 },
  ]),
  createLocation
);
router.get("/locations", getAllLocations);
router.put(
  "/locations/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 12 },
  ]),
  updateLocation
);
router.delete("/locations/:id", deleteLocation);

router.get("/bookings", getAllBookings);
router.put("/bookings/:id/status", updateBookingStatus);
router.delete("/bookings/:id", deleteBooking);

router.get("/posts", getAllPosts);
router.put("/posts/:id/status", updatePostStatus);
router.put("/posts/:id/approve", approvePost);
router.delete("/posts/:id", deletePost);
router.get("/reviews", getAllReviews);
router.put("/reviews/:id/status", updateReviewStatus);
router.delete("/reviews/:id", deleteReview);

router.post("/emails/announcements", sendAnnouncementEmailToUsers);
router.post("/emails/trip-reminders", sendUpcomingTripReminders);

module.exports = router;
