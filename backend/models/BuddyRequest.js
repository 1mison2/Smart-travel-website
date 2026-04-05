const mongoose = require("mongoose");

const BuddyRequestSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    travelPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPlan", required: true, index: true },
    senderPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPlan", default: null },
    receiverPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPlan", default: null },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

BuddyRequestSchema.index(
  { senderId: 1, receiverId: 1, travelPlanId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "accepted"] } } }
);

module.exports = mongoose.model("BuddyRequest", BuddyRequestSchema);
