const mongoose = require("mongoose");

const ListingReviewSchema = new mongoose.Schema(
  {
    author: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ListingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["hotel", "activity", "cafe", "restaurant"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    location: {
      name: { type: String, required: true, trim: true },
      address: { type: String, default: "", trim: true },
      district: { type: String, default: "", trim: true },
      province: { type: String, default: "", trim: true },
      lat: { type: Number },
      lng: { type: Number },
    },
    pricePerUnit: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 1, min: 1 },
    amenities: [{ type: String, trim: true }],
    photos: [{ type: String, trim: true }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: [ListingReviewSchema],
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Listing", ListingSchema);
