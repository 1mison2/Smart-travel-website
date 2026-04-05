const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const ChatRoom = require("../models/ChatRoom");
const Message = require("../models/Message");

const buildRoomId = (userA, userB) => [String(userA), String(userB)].sort().join(":");

const parseToken = (socket) => {
  const authHeader = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return authHeader || null;
};

const createSocketServer = (httpServer) => {
  let ServerClass;
  try {
    ({ Server: ServerClass } = require("socket.io"));
  } catch (_err) {
    console.warn("socket.io is not installed. Real-time chat is disabled.");
    return null;
  }

  const io = new ServerClass(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = parseToken(socket);
      if (!token) return next(new Error("Authentication required"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select("_id name email role isBlocked");
      if (!user || user.isBlocked) return next(new Error("Unauthorized"));

      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    socket.on("chat:join", ({ peerUserId }) => {
      if (!peerUserId) return;
      const roomId = buildRoomId(userId, peerUserId);
      socket.join(roomId);
      socket.emit("chat:joined", { roomId });
    });

    socket.on("chat:send", async (payload = {}) => {
      try {
        const receiverId = String(payload.receiverId || "").trim();
        const text = String(payload.text || "").trim();
        if (!receiverId || !text) return;

        const roomId = buildRoomId(userId, receiverId);
        const message = await ChatMessage.create({
          roomId,
          senderId: socket.user._id,
          receiverId,
          text,
          attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
        });

        const normalized = {
          _id: message._id,
          roomId: message.roomId,
          senderId: message.senderId,
          receiverId: message.receiverId,
          text: message.text,
          attachments: message.attachments,
          createdAt: message.createdAt,
        };
        io.to(roomId).emit("chat:message", normalized);
        io.to(`user:${receiverId}`).emit("chat:message", normalized);
      } catch (err) {
        socket.emit("chat:error", { message: "Failed to send message" });
      }
    });

    socket.on("chat:read", async ({ messageId }) => {
      try {
        if (!messageId) return;
        const message = await ChatMessage.findById(messageId);
        if (!message) return;
        if (String(message.receiverId) !== userId) return;

        message.isRead = true;
        message.readAt = new Date();
        await message.save();
        io.to(message.roomId).emit("chat:read", { messageId, readAt: message.readAt });
      } catch (_err) {
        // ignore read errors on socket channel
      }
    });

    socket.on("chat:join-room", async ({ chatRoomId }) => {
      try {
        if (!chatRoomId) return;
        const chatRoom = await ChatRoom.findById(chatRoomId).select("participants");
        if (!chatRoom) return;
        if (!chatRoom.participants.some((participantId) => String(participantId) === userId)) return;
        socket.join(`chat-room:${chatRoomId}`);
        socket.emit("chat:room-joined", { chatRoomId });
      } catch (_err) {
        socket.emit("chat:error", { message: "Failed to join room" });
      }
    });

    socket.on("chat:send-room", async ({ chatRoomId, message }) => {
      try {
        const trimmedMessage = String(message || "").trim();
        if (!chatRoomId || !trimmedMessage) return;
        const chatRoom = await ChatRoom.findById(chatRoomId);
        if (!chatRoom) return;
        if (!chatRoom.participants.some((participantId) => String(participantId) === userId)) return;

        const createdMessage = await Message.create({
          chatRoomId,
          senderId: socket.user._id,
          message: trimmedMessage,
          timestamp: new Date(),
        });

        const normalized = {
          _id: createdMessage._id,
          chatRoomId: createdMessage.chatRoomId,
          senderId: {
            _id: socket.user._id,
            name: socket.user.name,
            email: socket.user.email,
          },
          message: createdMessage.message,
          timestamp: createdMessage.timestamp,
        };
        io.to(`chat-room:${chatRoomId}`).emit("chat:room-message", normalized);
      } catch (_err) {
        socket.emit("chat:error", { message: "Failed to send room message" });
      }
    });
  });

  return io;
};

module.exports = { createSocketServer, buildRoomId };
