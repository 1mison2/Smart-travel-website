const mongoose = require("mongoose");

const TouristSpotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    estimatedCost: { type: Number, min: 0, default: 0 },
    estimatedTime: { type: Number, min: 0, default: 0 },
    imageUrl: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TouristSpot", TouristSpotSchema);
