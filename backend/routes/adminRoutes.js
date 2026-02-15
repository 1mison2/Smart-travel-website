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
  deleteBooking,
  getAllPosts,
  approvePost,
  deletePost,
} = require("../controllers/adminController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get("/stats", getAdminStats);

router.get("/users", getAllUsers);
router.put("/users/:id/block", toggleBlockUser);
router.delete("/users/:id", deleteUser);

router.post("/locations", createLocation);
router.get("/locations", getAllLocations);
router.put("/locations/:id", updateLocation);
router.delete("/locations/:id", deleteLocation);

router.get("/bookings", getAllBookings);
router.delete("/bookings/:id", deleteBooking);

router.get("/posts", getAllPosts);
router.put("/posts/:id/approve", approvePost);
router.delete("/posts/:id", deletePost);

module.exports = router;
