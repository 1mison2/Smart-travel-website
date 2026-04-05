const mongoose = require("mongoose");

const BookingPackageActivitySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const BookingPackageDaySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, min: 1 },
    title: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    hotelName: { type: String, trim: true, default: "" },
    meals: [{ type: String, trim: true }],
    transport: { type: String, trim: true, default: "" },
    altitude: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    activities: { type: [BookingPackageActivitySchema], default: [] },
  },
  { _id: false }
);

const BookingPackageSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    shortDescription: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    region: { type: String, trim: true, default: "" },
    pickupCity: { type: String, trim: true, default: "" },
    dropoffCity: { type: String, trim: true, default: "" },
    startDate: { type: Date },
    endDate: { type: Date },
    durationDays: { type: Number, min: 1, default: 1 },
    coverImage: { type: String, trim: true, default: "" },
    included: [{ type: String, trim: true }],
    excluded: [{ type: String, trim: true }],
    highlights: [{ type: String, trim: true }],
    bestSeason: { type: String, trim: true, default: "" },
    difficulty: { type: String, trim: true, default: "" },
    tripType: { type: String, trim: true, default: "" },
    cancellationPolicy: { type: String, trim: true, default: "" },
    paymentPolicy: { type: String, trim: true, default: "" },
    itineraryDays: { type: [BookingPackageDaySchema], default: [] },
  },
  { _id: false }
);

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
    packageSnapshot: { type: BookingPackageSnapshotSchema, default: undefined },
    bookingStatus: {
      type: String,
      enum: ["pending", "awaiting_payment", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentProvider: {
      type: String,
      enum: ["khalti"],
      default: "khalti",
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
    khaltiToken: { type: String, trim: true, default: "" },
    transactionId: { type: String, trim: true, default: "" },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    lastReminderEmailSentAt: { type: Date },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
