const express = require("express");
const {
  getMyNotifications,
  getAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/me", getMyNotifications);
router.get("/all", isAdmin, getAllNotifications);
router.put("/read-all", markAllNotificationsRead);
router.put("/:id/read", markNotificationRead);

module.exports = router;
