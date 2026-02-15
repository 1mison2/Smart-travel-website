const express = require("express");
const { getPublicLocations } = require("../controllers/locationController");

const router = express.Router();

router.get("/", getPublicLocations);

module.exports = router;
