const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    tripPackageId: { type: mongoose.Schema.Types.ObjectId, ref: "TripPackage" },
    addOnListingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    guests: { type: Number, min: 1, default: 1 },
    bookingType: {
      type: String,
      enum: ["legacy", "hotel", "activity", "cafe", "restaurant", "trip"],
      default: "legacy",
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NPR", trim: true },
    pricingSnapshot: {
      unitPrice: { type: Number, default: 0, min: 0 },
      nights: { type: Number, default: 1, min: 1 },
      subtotal: { type: Number, default: 0, min: 0 },
      serviceFee: { type: Number, default: 0, min: 0 },
      tax: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 },
      basePrice: { type: Number, default: 0, min: 0 },
      addOnTotal: { type: Number, default: 0, min: 0 },
      addOns: {
        type: [
          {
            listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
            title: { type: String, trim: true },
            price: { type: Number, default: 0, min: 0 },
          },
        ],
        default: [],
      },
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "awaiting_payment", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentProvider: {
      type: String,
      enum: ["mock", "stripe", "paypal"],
      default: "mock",
    },
    paymentId: {
      type: String,
      trim: true,
      sparse: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
