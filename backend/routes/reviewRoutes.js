const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createReview, getReviewsByDestination } = require("../controllers/communityController");

const router = express.Router();

router.use(protect);
router.post("/create", createReview);
router.get("/:destination", getReviewsByDestination);

module.exports = router;
