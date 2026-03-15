const mongoose = require("mongoose");

const TripPackageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NPR", trim: true },
    capacity: { type: Number, default: 1, min: 1 },
    coverImage: { type: String, trim: true, default: "" },
    included: { type: [String], default: [] },
    addOnListings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TripPackage", TripPackageSchema);
