const express = require("express");
const {
  generateItinerary,
  getMyItineraries,
  getItineraryById,
  deleteItinerary,
} = require("../controllers/itineraryController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/generate", generateItinerary);
router.get("/me", getMyItineraries);
router.get("/:id", getItineraryById);
router.delete("/:id", deleteItinerary);

module.exports = router;
