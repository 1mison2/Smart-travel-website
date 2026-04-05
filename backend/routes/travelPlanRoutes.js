const express = require("express");
const {
  createTravelPlan,
  getTravelPlanById,
  getTravelPlans,
  deleteTravelPlan,
} = require("../controllers/travelPlanController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.post("/create", createTravelPlan);
router.get("/", getTravelPlans);
router.get("/:id", getTravelPlanById);
router.delete("/:id", deleteTravelPlan);

module.exports = router;
