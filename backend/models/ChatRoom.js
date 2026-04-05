const mongoose = require("mongoose");

const ChatRoomSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }],
    travelPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPlan", default: null, index: true },
    buddyRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "BuddyRequest", default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
