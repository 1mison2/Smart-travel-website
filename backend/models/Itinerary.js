const mongoose = require("mongoose");

const ItineraryDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    places: [
      {
        placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
        name: { type: String, required: true, trim: true },
        category: { type: String, default: "", trim: true },
        image: { type: String, default: "", trim: true },
        estimatedCost: { type: Number, default: 0, min: 0 },
        notes: { type: String, default: "", trim: true },
      },
    ],
    estimatedCost: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const ItinerarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    destination: { type: String, required: true, trim: true, index: true },
    durationDays: { type: Number, required: true, min: 1, max: 30 },
    budget: { type: Number, required: true, min: 0 },
    interests: [{ type: String, trim: true }],
    startDate: { type: Date },
    days: { type: [ItineraryDaySchema], default: [] },
    totalEstimatedCost: { type: Number, default: 0, min: 0 },
    source: { type: String, enum: ["rule_based", "manual"], default: "rule_based" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Itinerary", ItinerarySchema);
