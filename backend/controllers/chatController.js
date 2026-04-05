const mongoose = require("mongoose");
const ChatMessage = require("../models/ChatMessage");
const ChatRoom = require("../models/ChatRoom");
const Message = require("../models/Message");

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

exports.getChatRoomMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    if (!isValidObjectId(chatRoomId)) return res.status(400).json({ message: "Invalid chat room id" });

    const chatRoom = await ChatRoom.findById(chatRoomId).populate("participants", "name email profilePicture");
    if (!chatRoom) return res.status(404).json({ message: "Chat room not found" });
    if (!chatRoom.participants.some((participant) => String(participant._id) === String(req.user._id))) {
      return res.status(403).json({ message: "You cannot access this chat room" });
    }

    const messages = await Message.find({ chatRoomId })
      .sort({ timestamp: 1 })
      .limit(400)
      .populate("senderId", "name email profilePicture");

    return res.json({ chatRoom, messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch chat messages" });
  }
};

exports.postChatRoomMessage = async (req, res) => {
  try {
    const { chatRoomId, message } = req.body || {};
    if (!chatRoomId || !message || !isValidObjectId(chatRoomId)) {
      return res.status(400).json({ message: "chatRoomId and message are required" });
    }

    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) return res.status(404).json({ message: "Chat room not found" });
    if (!chatRoom.participants.some((participantId) => String(participantId) === String(req.user._id))) {
      return res.status(403).json({ message: "You cannot send messages to this chat room" });
    }

    const createdMessage = await Message.create({
      chatRoomId,
      senderId: req.user._id,
      message: String(message).trim().slice(0, 2000),
      timestamp: new Date(),
    });

    const populated = await Message.findById(createdMessage._id).populate("senderId", "name email profilePicture");
    return res.status(201).json({ message: "Message sent", chatMessage: populated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to send chat message" });
  }
};
