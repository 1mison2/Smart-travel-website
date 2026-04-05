const express = require("express");
const {
  searchTravelBuddies,
  getMatchesForTravelPlan,
  createBuddyRequest,
  acceptBuddyRequest,
  rejectBuddyRequest,
  cancelBuddyRequest,
  getBuddyRequests,
} = require("../controllers/buddyController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/search", searchTravelBuddies);
router.get("/match/:travelPlanId", getMatchesForTravelPlan);
router.post("/request", createBuddyRequest);
router.post("/accept", acceptBuddyRequest);
router.post("/reject", rejectBuddyRequest);
router.post("/cancel", cancelBuddyRequest);
router.get("/requests", getBuddyRequests);

module.exports = router;
