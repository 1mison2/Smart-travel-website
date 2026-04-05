const express = require("express");
const {
  getConversation,
  getMyRecentChats,
  getChatRoomMessages,
  postChatRoomMessage,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/recent", getMyRecentChats);
router.get("/conversation/:userId", getConversation);
router.get("/:chatRoomId", getChatRoomMessages);
router.post("/message", postChatRoomMessage);

module.exports = router;
