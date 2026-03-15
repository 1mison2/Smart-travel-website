const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "booking_created",
        "booking_updated",
        "booking_cancelled",
        "trip_booking_created",
        "payment_initiated",
        "payment_success",
        "payment_failed",
        "system",
      ],
      default: "system",
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
