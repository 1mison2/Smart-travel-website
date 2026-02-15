const mongoose = require("mongoose");
const User = require("../models/User");
const Location = require("../models/Location");
const Booking = require("../models/Booking");
const Post = require("../models/Post");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeUser = (user) => ({
  ...user,
  role: user.role === "admin" ? "admin" : "user",
});

exports.getAdminStats = async (_req, res) => {
  try {
    const [totalUsers, totalLocations, totalBookings, totalPosts, revenueAgg] = await Promise.all([
      User.countDocuments(),
      Location.countDocuments(),
      Booking.countDocuments(),
      Post.countDocuments(),
      Booking.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$amount" } } }]),
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    res.json({
      totalUsers,
      totalLocations,
      totalBookings,
      totalPosts,
      totalRevenue,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
};

exports.getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    res.json(users.map(normalizeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

exports.toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isBlocked =
      typeof req.body?.isBlocked === "boolean" ? req.body.isBlocked : !user.isBlocked;

    user.isBlocked = isBlocked;
    await user.save();

    const payload = user.toObject();
    delete payload.password;
    res.json({ message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`, user: normalizeUser(payload) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user block status" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });
    if (req.user?._id?.toString() === id) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const {
      name,
      province,
      district,
      description,
      category,
      averageCost,
      image,
      latitude,
      longitude,
    } = req.body;

    if (!name || !province || !district || !description || !category) {
      return res
        .status(400)
        .json({ message: "Name, province, district, description, and category are required" });
    }

    const location = await Location.create({
      name: name.trim(),
      province: province.trim(),
      district: district.trim(),
      description: description.trim(),
      category: category.trim(),
      averageCost: Number(averageCost) || 0,
      image: image || "",
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    res.status(201).json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create location" });
  }
};

exports.getAllLocations = async (_req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid location id" });

    const payload = { ...req.body };
    if (payload.name !== undefined) payload.name = String(payload.name).trim();
    if (payload.province !== undefined) payload.province = String(payload.province).trim();
    if (payload.district !== undefined) payload.district = String(payload.district).trim();
    if (payload.description !== undefined) payload.description = String(payload.description).trim();
    if (payload.category !== undefined) payload.category = String(payload.category).trim();
    if (payload.averageCost !== undefined) payload.averageCost = Number(payload.averageCost);
    if (payload.latitude !== undefined) payload.latitude = Number(payload.latitude);
    if (payload.longitude !== undefined) payload.longitude = Number(payload.longitude);

    const updated = await Location.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Location not found" });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update location" });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid location id" });

    const deleted = await Location.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Location not found" });

    res.json({ message: "Location deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete location" });
  }
};

exports.getAllBookings = async (_req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .populate("locationId", "name province district");
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id" });

    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Booking not found" });

    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete booking" });
  }
};

exports.getAllPosts = async (_req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("userId", "name email");
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

exports.approvePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid post id" });

    const post = await Post.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.json({ message: "Post approved successfully", post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve post" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid post id" });

    const deleted = await Post.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Post not found" });

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};
