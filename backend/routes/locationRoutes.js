const express = require("express");
const { getPublicLocations, getPublicLocationById } = require("../controllers/locationController");

const router = express.Router();

router.get("/", getPublicLocations);
router.get("/:id", getPublicLocationById);

module.exports = router;
