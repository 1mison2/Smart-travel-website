const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createReview, getReviewsByDestination, updateReview, deleteReview } = require("../controllers/communityController");

const router = express.Router();

router.use(protect);
router.post("/create", createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);
router.get("/:destination", getReviewsByDestination);

module.exports = router;
