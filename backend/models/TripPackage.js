const mongoose = require("mongoose");

const TripPackageActivitySchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    title: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const TripPackageFaqSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, default: "" },
    answer: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const TripPackageDaySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true, min: 1 },
    title: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    hotelName: { type: String, trim: true, default: "" },
    hotelListingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    meals: [{ type: String, trim: true }],
    transport: { type: String, trim: true, default: "" },
    altitude: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    activities: { type: [TripPackageActivitySchema], default: [] },
  },
  { _id: false }
);

const TripPackageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, index: true, default: "" },
    shortDescription: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    region: { type: String, trim: true, default: "" },
    pickupCity: { type: String, trim: true, default: "" },
    dropoffCity: { type: String, trim: true, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "NPR", trim: true },
    capacity: { type: Number, default: 1, min: 1 },
    minGuests: { type: Number, default: 1, min: 1 },
    maxGuests: { type: Number, default: 1, min: 1 },
    coverImage: { type: String, trim: true, default: "" },
    galleryImages: [{ type: String, trim: true }],
    videoUrl: { type: String, trim: true, default: "" },
    included: { type: [String], default: [] },
    excluded: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    bestSeason: { type: String, trim: true, default: "" },
    difficulty: { type: String, trim: true, default: "" },
    tripType: { type: String, trim: true, default: "" },
    cancellationPolicy: { type: String, trim: true, default: "" },
    paymentPolicy: { type: String, trim: true, default: "" },
    faqs: { type: [TripPackageFaqSchema], default: [] },
    itineraryDays: { type: [TripPackageDaySchema], default: [] },
    addOnListings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TripPackage", TripPackageSchema);
