const mongoose = require("mongoose");

const TravelPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true, maxlength: 180, default: "" },
    destination: { type: String, required: true, trim: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    budget: { type: Number, required: true, min: 0 },
    budgetRangeLabel: { type: String, default: "" },
    travelStyle: { type: String, trim: true, default: "" },
    interests: { type: [String], default: [] },
    description: { type: String, trim: true, maxlength: 1200, default: "" },
  },
  { timestamps: true }
);

TravelPlanSchema.index({ destination: "text", interests: "text", description: "text" });

module.exports = mongoose.model("TravelPlan", TravelPlanSchema);
