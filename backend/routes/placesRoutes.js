const express = require("express");
const { searchPlaces, getNearbyPlaces, getPlaceDetails } = require("../controllers/placesController");

const router = express.Router();

router.get("/search", searchPlaces);
router.get("/nearby", getNearbyPlaces);
router.get("/details/:placeId", getPlaceDetails);

module.exports = router;
