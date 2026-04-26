const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const User = require("../models/User");
const Location = require("../models/Location");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Post = require("../models/Post");
const Review = require("../models/Review");
const { createNotification, notifyAdmins } = require("../utils/notificationService");
const {
  canSendEmail,
  sendAnnouncementEmail,
  sendTripReminderEmail,
} = require("../utils/emailService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const buildImageUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/${filename}`;
const uploadsDir = path.join(__dirname, "..", "uploads");

const dedupeImages = (images) => Array.from(new Set((images || []).filter(Boolean)));
const uploadedUrlsForField = (req, fieldName) =>
  Array.isArray(req.files?.[fieldName])
    ? req.files[fieldName].map((file) => buildImageUrl(req, file.filename)).filter(Boolean)
    : [];

const extractUploadFilename = (mediaUrl) => {
  if (!mediaUrl || typeof mediaUrl !== "string") return "";
  try {
    const parsed = new URL(mediaUrl);
    const match = parsed.pathname.match(/\/uploads\/([^/?#]+)/);
    return match?.[1] || "";
  } catch (_err) {
    const match = mediaUrl.match(/\/uploads\/([^/?#]+)/);
    return match?.[1] || "";
  }
};

const removeUploadedFiles = async (mediaUrls = []) => {
  const filenames = Array.from(
    new Set(mediaUrls.map(extractUploadFilename).filter(Boolean))
  );
  await Promise.all(
    filenames.map(async (filename) => {
      try {
        await fs.unlink(path.join(uploadsDir, filename));
      } catch (err) {
        if (err?.code !== "ENOENT") {
          console.warn(`Failed to remove uploaded file: ${filename}`, err);
        }
      }
    })
  );
};

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
  return dedupeImages(images);
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
    await notifyAdmins({
      type: "system",
      title: `User ${isBlocked ? "blocked" : "unblocked"}`,
      message: `Admin ${req.user?.name || req.user?.email} ${isBlocked ? "blocked" : "unblocked"} user ${
        user.name || user.email
      }.`,
      meta: { userId: user._id, isBlocked },
    });
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

    await notifyAdmins({
      type: "system",
      title: "User deleted",
      message: `Admin ${req.user?.name || req.user?.email} deleted user ${deleted.name || deleted.email}.`,
      meta: { userId: deleted._id },
    });
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
      parentLocationId,
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
      parentLocationId: isValidObjectId(parentLocationId) ? parentLocationId : null,
      description: description.trim(),
      category: category.trim(),
      averageCost: numericCost,
      image: coverImage,
      images: dedupeImages(uploadedImages),
      latitude: numericLatitude,
      longitude: numericLongitude,
    });
    const populatedLocation = await Location.findById(location._id).populate(
      "parentLocationId",
      "name district province category"
    );

    await notifyAdmins({
      type: "system",
      title: "Location created",
      message: `Admin ${req.user?.name || req.user?.email} created location ${location.name}.`,
      meta: { locationId: location._id },
    });
    res.status(201).json(populatedLocation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create location" });
  }
};

exports.getAllLocations = async (_req, res) => {
  try {
    const locations = await Location.find()
      .populate("parentLocationId", "name district province category")
      .sort({ createdAt: -1 });
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
    if (payload.parentLocationId !== undefined) {
      payload.parentLocationId = isValidObjectId(payload.parentLocationId) ? payload.parentLocationId : null;
    }
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

    const uploadedCover = uploadedUrlsForField(req, "image");
    const uploadedGallery = uploadedUrlsForField(req, "images");
    const hasCoverUpload = uploadedCover.length > 0;
    const hasGalleryUpload = uploadedGallery.length > 0;

    if (hasCoverUpload || hasGalleryUpload) {
      payload.image = hasCoverUpload ? uploadedCover[0] : location.image || "";
      payload.images = hasGalleryUpload
        ? dedupeImages(uploadedGallery)
        : dedupeImages(Array.isArray(location.images) ? location.images : []);

      const previousMedia = dedupeImages([
        location.image || "",
        ...(Array.isArray(location.images) ? location.images : []),
      ]);
      const nextMedia = dedupeImages([payload.image || "", ...(payload.images || [])]);
      const removedMedia = previousMedia.filter((item) => !nextMedia.includes(item));
      if (removedMedia.length) {
        await removeUploadedFiles(removedMedia);
      }
    }

    const updated = await Location.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).populate("parentLocationId", "name district province category");

    await notifyAdmins({
      type: "system",
      title: "Location updated",
      message: `Admin ${req.user?.name || req.user?.email} updated location ${updated.name}.`,
      meta: { locationId: updated._id },
    });
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
    await Location.updateMany({ parentLocationId: deleted._id }, { $set: { parentLocationId: null } });

    await notifyAdmins({
      type: "system",
      title: "Location deleted",
      message: `Admin ${req.user?.name || req.user?.email} deleted location ${deleted.name}.`,
      meta: { locationId: deleted._id },
    });
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
      .populate("locationId", "name province district")
      .populate("listingId", "title type")
      .populate("tripPackageId", "title");
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

    const booking = await Booking.findById(id).select("paymentStatus bookingStatus amount");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Paid bookings cannot be deleted. Use a refund flow first." });
    }

    await Booking.findByIdAndDelete(id);

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

    const booking = await Booking.findById(id)
      .populate("userId", "name email")
      .populate("locationId", "name")
      .populate("listingId", "title")
      .populate("tripPackageId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.bookingStatus === bookingStatus) {
      return res.json({ message: "Booking status already up to date", booking });
    }
    if (booking.paymentStatus === "paid" && bookingStatus !== "confirmed") {
      return res.status(400).json({
        message: "Paid bookings cannot be cancelled or changed here. Handle refund/admin review first.",
      });
    }

    booking.bookingStatus = bookingStatus;
    if (bookingStatus === "cancelled") booking.cancelledAt = new Date();
    if (bookingStatus !== "cancelled") booking.cancelledAt = undefined;
    await booking.save();

    const bookingName =
      booking.tripPackageId?.title ||
      booking.listingId?.title ||
      booking.locationId?.name ||
      "selected booking";

    await createNotification({
      recipient: booking.userId,
      type: "booking_updated",
      title: "Booking status updated",
      message: `Your booking for ${bookingName} is now ${bookingStatus}.`,
      meta: { bookingId: booking._id, bookingStatus },
    });
    await notifyAdmins({
      type: "booking_updated",
      title: "Booking status updated",
      message: `Admin ${req.user?.name || req.user?.email} set booking status to ${bookingStatus}.`,
      meta: { bookingId: booking._id, bookingStatus, userId: booking.userId },
    });

    res.json({ message: "Booking status updated successfully", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update booking status" });
  }
};

exports.reviewRefundRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const action = String(req.body?.action || "").trim().toLowerCase();
    const note = String(req.body?.note || "").trim();

    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id" });
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be approve or reject" });
    }

    const booking = await Booking.findById(id)
      .populate("userId", "name email")
      .populate("locationId", "name")
      .populate("listingId", "title")
      .populate("tripPackageId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.refundRequestStatus !== "requested") {
      return res.status(400).json({ message: "There is no pending refund request for this booking" });
    }

    const bookingName =
      booking.tripPackageId?.title ||
      booking.listingId?.title ||
      booking.locationId?.name ||
      "selected booking";

    booking.refundDecisionNote = note;
    booking.refundReviewedAt = new Date();

    if (action === "approve") {
      booking.refundRequestStatus = "approved";
      booking.paymentStatus = "refunded";
      booking.bookingStatus = "cancelled";
      booking.cancelledAt = booking.cancelledAt || new Date();
      booking.refundedAt = new Date();
      booking.refundedAmount = Number(booking.amount || 0);

      await Payment.updateMany(
        { bookingId: booking._id, status: { $in: ["success", "initiated"] } },
        {
          $set: {
            status: "refunded",
            refundedAt: booking.refundedAt,
            refundAmount: booking.refundedAmount,
            refundReason: booking.refundReason || note,
            verifiedAt: new Date(),
          },
        }
      );

      await createNotification({
        recipient: booking.userId._id,
        type: "refund_approved",
        title: "Refund approved",
        message: `Your refund request for ${bookingName} was approved.`,
        meta: { bookingId: booking._id, refundedAmount: booking.refundedAmount },
      });
      await notifyAdmins({
        type: "refund_approved",
        title: "Refund approved",
        message: `Admin ${req.user?.name || req.user?.email} approved a refund for ${bookingName}.`,
        meta: { bookingId: booking._id, userId: booking.userId._id, refundedAmount: booking.refundedAmount },
      });
    } else {
      booking.refundRequestStatus = "rejected";

      await createNotification({
        recipient: booking.userId._id,
        type: "refund_rejected",
        title: "Refund request rejected",
        message: `Your refund request for ${bookingName} was rejected.`,
        meta: { bookingId: booking._id, note },
      });
      await notifyAdmins({
        type: "refund_rejected",
        title: "Refund request rejected",
        message: `Admin ${req.user?.name || req.user?.email} rejected a refund for ${bookingName}.`,
        meta: { bookingId: booking._id, userId: booking.userId._id, note },
      });
    }

    await booking.save();
    res.json({ message: `Refund request ${action}d successfully`, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to review refund request" });
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

exports.updatePostStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid post id" });
    if (!["approved", "rejected", "pending"].includes(String(status))) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const post = await Post.findById(id).populate("userId", "name email");
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.status = String(status);
    await post.save();
    return res.json({ message: `Post ${status}`, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update post status" });
  }
};

exports.approvePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid post id" });

    const post = await Post.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });

    await notifyAdmins({
      type: "system",
      title: "Post approved",
      message: `Admin ${req.user?.name || req.user?.email} approved a post.`,
      meta: { postId: post._id, userId: post.userId },
    });
    res.json({ message: "Post approved successfully", post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve post" });
  }
};

exports.getAllReviews = async (_req, res) => {
  try {
    const reviews = await Review.find()
      .populate("userId", "name email profilePicture")
      .sort({ createdAt: -1 });
    return res.json(reviews);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid review id" });
    if (!["approved", "rejected", "pending"].includes(String(status))) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const review = await Review.findById(id).populate("userId", "name email");
    if (!review) return res.status(404).json({ message: "Review not found" });
    review.status = String(status);
    await review.save();
    return res.json({ message: `Review ${status}`, review });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update review status" });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid review id" });
    const review = await Review.findByIdAndDelete(id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    return res.json({ message: "Review deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete review" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid post id" });

    const deleted = await Post.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Post not found" });

    await notifyAdmins({
      type: "system",
      title: "Post deleted",
      message: `Admin ${req.user?.name || req.user?.email} deleted a post.`,
      meta: { postId: deleted._id, userId: deleted.userId },
    });
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

exports.sendAnnouncementEmailToUsers = async (req, res) => {
  try {
    const { subject, message, newsletterOnly = true } = req.body || {};
    const trimmedSubject = String(subject || "").trim();
    const trimmedMessage = String(message || "").trim();

    if (!trimmedSubject || !trimmedMessage) {
      return res.status(400).json({ message: "subject and message are required" });
    }

    const users = await User.find({ isBlocked: false })
      .select("name email notifications")
      .lean();

    const recipients = users.filter((user) =>
      canSendEmail(user, newsletterOnly ? "newsletter" : "general")
    );

    const results = await Promise.allSettled(
      recipients.map((user) =>
        sendAnnouncementEmail({
          email: user.email,
          customerName: user.name,
          subject: trimmedSubject,
          message: trimmedMessage,
        })
      )
    );

    const sentCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = results.length - sentCount;

    await notifyAdmins({
      type: "system",
      title: "Announcement email sent",
      message: `Admin ${req.user?.name || req.user?.email} sent an email campaign to ${sentCount} users.`,
      meta: { subject: trimmedSubject, sentCount, failedCount, newsletterOnly: Boolean(newsletterOnly) },
    });

    return res.json({
      message: "Announcement email processing complete",
      recipients: recipients.length,
      sentCount,
      failedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send announcement emails" });
  }
};

exports.sendUpcomingTripReminders = async (req, res) => {
  try {
    const windowHours = Math.max(1, Number(req.body?.windowHours || 48));
    const now = new Date();
    const upperBound = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

    const bookings = await Booking.find({
      bookingStatus: "confirmed",
      checkIn: { $gte: now, $lte: upperBound },
      $or: [
        { lastReminderEmailSentAt: { $exists: false } },
        { lastReminderEmailSentAt: null },
      ],
    })
      .populate("userId", "name email notifications")
      .populate("locationId", "name")
      .populate("listingId", "title")
      .populate("tripPackageId", "title")
      .limit(200);

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const booking of bookings) {
      const user = booking.userId;
      if (!canSendEmail(user, "tripReminder")) {
        skippedCount += 1;
        continue;
      }

      const bookingName =
        booking.tripPackageId?.title ||
        booking.listingId?.title ||
        booking.locationId?.name ||
        "your upcoming trip";

      try {
        await sendTripReminderEmail({
          email: user.email,
          customerName: user.name,
          bookingName,
          bookingId: String(booking._id),
          checkIn: booking.checkIn || booking.date,
          packageSnapshot: booking.packageSnapshot,
        });
        booking.lastReminderEmailSentAt = new Date();
        await booking.save();
        sentCount += 1;
      } catch (error) {
        console.error("Failed to send trip reminder email:", error);
        failedCount += 1;
      }
    }

    await notifyAdmins({
      type: "system",
      title: "Trip reminders processed",
      message: `Admin ${req.user?.name || req.user?.email} processed upcoming trip reminder emails.`,
      meta: { windowHours, sentCount, skippedCount, failedCount },
    });

    return res.json({
      message: "Trip reminder email processing complete",
      windowHours,
      matchedBookings: bookings.length,
      sentCount,
      skippedCount,
      failedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send trip reminder emails" });
  }
};
