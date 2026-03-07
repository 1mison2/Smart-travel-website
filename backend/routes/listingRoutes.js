const express = require("express");
const { getListings, getListingById } = require("../controllers/listingController");

const router = express.Router();

router.get("/", getListings);
router.get("/:id", getListingById);

module.exports = router;
