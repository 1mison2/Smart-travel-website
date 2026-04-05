const express = require("express");
const {
  getPublicLocations,
  getPublicLocationById,
  getSavedLocations,
  saveLocation,
  removeSavedLocation,
} = require("../controllers/locationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/saved/me", protect, getSavedLocations);
router.post("/:id/save", protect, saveLocation);
router.delete("/:id/save", protect, removeSavedLocation);
router.get("/", getPublicLocations);
router.get("/:id", getPublicLocationById);

module.exports = router;
