const express = require("express");
const {
  createTouristSpot,
  getAllTouristSpots,
  getTouristSpotById,
} = require("../controllers/touristSpotController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// Create tourist spot (admin only)
router.post("/", protect, authorizeRoles("admin"), createTouristSpot);

// Get all tourist spots
router.get("/", getAllTouristSpots);

// Get single tourist spot by ID
router.get("/:id", getTouristSpotById);

module.exports = router;
