const express = require("express");
const { getConversation, getMyRecentChats } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/recent", getMyRecentChats);
router.get("/conversation/:userId", getConversation);

module.exports = router;
