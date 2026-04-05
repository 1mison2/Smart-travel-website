const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    parentLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    averageCost: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    images: [{ type: String, trim: true }],
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", LocationSchema);
