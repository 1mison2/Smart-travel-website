const User = require("../models/User");
const Notification = require("../models/Notification");

const createNotification = async ({ recipient, type, title, message, meta = {} }) => {
  if (!recipient || !title || !message) return null;
  return Notification.create({ recipient, type, title, message, meta });
};

const notifyAdmins = async ({ type, title, message, meta = {} }) => {
  if (!title || !message) return [];
  const admins = await User.find({ role: "admin", isBlocked: false }).select("_id").lean();
  if (!admins.length) return [];

  const payload = admins.map((admin) => ({
    recipient: admin._id,
    type,
    title,
    message,
    meta,
  }));

  return Notification.insertMany(payload);
};

module.exports = {
  createNotification,
  notifyAdmins,
};
