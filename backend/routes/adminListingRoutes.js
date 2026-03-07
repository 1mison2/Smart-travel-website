const express = require("express");
const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
} = require("../controllers/listingController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(verifyToken, isAdmin);

router.post("/", upload.array("photos", 8), createListing);
router.get("/", getListings);
router.get("/:id", getListingById);
router.put("/:id", upload.array("photos", 8), updateListing);
router.delete("/:id", deleteListing);

module.exports = router;
