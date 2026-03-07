const mongoose = require("mongoose");
const ChatMessage = require("../models/ChatMessage");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildRoomId = (userA, userB) => [String(userA), String(userB)].sort().join(":");

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return res.status(400).json({ message: "Invalid user id" });

    const roomId = buildRoomId(req.user._id, userId);
    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(300)
      .populate("senderId", "name email")
      .populate("receiverId", "name email");

    res.json({ roomId, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
};

exports.getMyRecentChats = async (req, res) => {
  try {
    const userId = String(req.user._id);
    const recent = await ChatMessage.aggregate([
      {
        $match: {
          $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      { $limit: 50 },
    ]);

    const chats = recent.map((item) => {
      const parts = String(item._id).split(":");
      const otherUserId = parts.find((id) => id !== userId) || userId;
      return {
        roomId: item._id,
        otherUserId,
        text: item.lastMessage.text,
        createdAt: item.lastMessage.createdAt,
        senderId: item.lastMessage.senderId,
      };
    });

    res.json({ chats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
};
