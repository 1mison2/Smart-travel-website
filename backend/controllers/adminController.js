const mongoose = require("mongoose");
const User = require("../models/User");
const Location = require("../models/Location");
const Booking = require("../models/Booking");
const Post = require("../models/Post");
const { createNotification } = require("../utils/notificationService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const buildImageUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/${filename}`;

const extractUploadedImages = (req) => {
  const images = [];
  const fieldFiles = req.files || {};
  if (Array.isArray(fieldFiles.images)) {
    images.push(...fieldFiles.images.map((file) => buildImageUrl(req, file.filename)));
  }
  if (Array.isArray(fieldFiles.image)) {
    images.push(...fieldFiles.image.map((file) => buildImageUrl(req, file.filename)));
  }
  if (req.file) {
    images.push(buildImageUrl(req, req.file.filename));
  }
  return images.filter(Boolean);
};

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
      latitude,
      longitude,
    } = req.body;

    if (!name || !province || !district || !description || !category || averageCost === undefined || latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ message: "All fields are required" });
    }

    const numericCost = Number(averageCost);
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);

    if (Number.isNaN(numericCost) || Number.isNaN(numericLatitude) || Number.isNaN(numericLongitude)) {
      return res.status(400).json({ message: "Average cost, latitude, and longitude must be valid numbers" });
    }

    const uploadedImages = extractUploadedImages(req);
    const coverImage = uploadedImages[0] || "";

    const location = await Location.create({
      name: name.trim(),
      province: province.trim(),
      district: district.trim(),
      description: description.trim(),
      category: category.trim(),
      averageCost: numericCost,
      image: coverImage,
      images: uploadedImages,
      latitude: numericLatitude,
      longitude: numericLongitude,
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
    if (
      (payload.averageCost !== undefined && Number.isNaN(payload.averageCost)) ||
      (payload.latitude !== undefined && Number.isNaN(payload.latitude)) ||
      (payload.longitude !== undefined && Number.isNaN(payload.longitude))
    ) {
      return res.status(400).json({ message: "Average cost, latitude, and longitude must be valid numbers" });
    }
    const location = await Location.findById(id);
    if (!location) return res.status(404).json({ message: "Location not found" });

    const uploadedImages = extractUploadedImages(req);
    if (uploadedImages.length) {
      const existingImages = Array.isArray(location.images) ? location.images : [];
      payload.images = [...existingImages, ...uploadedImages];
      payload.image = payload.images[0] || location.image || "";
    }

    const updated = await Location.findByIdAndUpdate(id, payload, { new: true, runValidators: true });

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

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingStatus } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id" });
    if (!["pending", "confirmed", "cancelled"].includes(bookingStatus)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    const booking = await Booking.findById(id).populate("locationId", "name");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.bookingStatus = bookingStatus;
    if (bookingStatus === "cancelled") booking.cancelledAt = new Date();
    if (bookingStatus !== "cancelled") booking.cancelledAt = undefined;
    await booking.save();

    await createNotification({
      recipient: booking.userId,
      type: "booking_updated",
      title: "Booking status updated",
      message: `Your booking for ${
        booking.locationId?.name || "selected location"
      } is now ${bookingStatus}.`,
      meta: { bookingId: booking._id, bookingStatus },
    });

    res.json({ message: "Booking status updated successfully", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update booking status" });
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
