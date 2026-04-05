const mongoose = require("mongoose");
const TripPackage = require("../models/TripPackage");
const Listing = require("../models/Listing");
const Booking = require("../models/Booking");
const { createNotification, notifyAdmins } = require("../utils/notificationService");
const { canSendEmail, sendTripBookingCreatedEmail } = require("../utils/emailService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getDurationDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
};

const buildPackageSnapshot = (tripPackage, addOnsPricing) => ({
  title: tripPackage.title || "",
  shortDescription: tripPackage.shortDescription || "",
  description: tripPackage.description || "",
  location: tripPackage.location || "",
  region: tripPackage.region || "",
  pickupCity: tripPackage.pickupCity || "",
  dropoffCity: tripPackage.dropoffCity || "",
  startDate: tripPackage.startDate,
  endDate: tripPackage.endDate,
  durationDays: getDurationDays(tripPackage.startDate, tripPackage.endDate),
  coverImage: tripPackage.coverImage || "",
  included: Array.isArray(tripPackage.included) ? tripPackage.included : [],
  excluded: Array.isArray(tripPackage.excluded) ? tripPackage.excluded : [],
  highlights: Array.isArray(tripPackage.highlights) ? tripPackage.highlights : [],
  bestSeason: tripPackage.bestSeason || "",
  difficulty: tripPackage.difficulty || "",
  tripType: tripPackage.tripType || "",
  cancellationPolicy: tripPackage.cancellationPolicy || "",
  paymentPolicy: tripPackage.paymentPolicy || "",
  itineraryDays: Array.isArray(tripPackage.itineraryDays)
    ? tripPackage.itineraryDays.map((day, index) => ({
        dayNumber: Number(day?.dayNumber || index + 1),
        title: String(day?.title || "").trim(),
        summary: String(day?.summary || "").trim(),
        hotelName:
          String(day?.hotelName || "").trim() ||
          String(day?.hotelListingId?.title || "").trim(),
        meals: Array.isArray(day?.meals) ? day.meals.map((item) => String(item || "").trim()).filter(Boolean) : [],
        transport: String(day?.transport || "").trim(),
        altitude: String(day?.altitude || "").trim(),
        notes: String(day?.notes || "").trim(),
        image: String(day?.image || "").trim(),
        activities: Array.isArray(day?.activities)
          ? day.activities
              .map((activity) => ({
                title:
                  String(activity?.title || "").trim() ||
                  String(activity?.listingId?.title || "").trim(),
                notes: String(activity?.notes || "").trim(),
              }))
              .filter((activity) => activity.title)
          : [],
      }))
    : [],
  selectedAddOns: addOnsPricing.map((item) => ({
    title: item.title,
    price: item.price,
  })),
});

const normalizePackage = (pkg) => ({
  ...pkg,
  addOnListings: Array.isArray(pkg.addOnListings) ? pkg.addOnListings : [],
  included: Array.isArray(pkg.included) ? pkg.included : [],
  excluded: Array.isArray(pkg.excluded) ? pkg.excluded : [],
  highlights: Array.isArray(pkg.highlights) ? pkg.highlights : [],
  faqs: Array.isArray(pkg.faqs) ? pkg.faqs : [],
  itineraryDays: Array.isArray(pkg.itineraryDays) ? pkg.itineraryDays : [],
  durationDays: getDurationDays(pkg.startDate, pkg.endDate),
  effectivePrice: Number(pkg.discountPrice || 0) > 0 ? Number(pkg.discountPrice) : Number(pkg.basePrice || 0),
});

const populatePackageQuery = (query) =>
  query
    .populate("addOnListings", "title type pricePerUnit pricing isActive location photos")
    .populate("itineraryDays.hotelListingId", "title type location pricePerUnit photos")
    .populate("itineraryDays.activities.listingId", "title type location pricePerUnit photos");

exports.getTripPackages = async (_req, res) => {
  try {
    const packages = await populatePackageQuery(
      TripPackage.find({ isActive: true }).sort({ isFeatured: -1, startDate: 1 }).lean()
    );
    res.json({ packages: packages.map(normalizePackage) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch trip packages" });
  }
};

exports.getTripPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid trip package id" });
    const tripPackage = await populatePackageQuery(TripPackage.findById(id).lean());
    if (!tripPackage || !tripPackage.isActive) return res.status(404).json({ message: "Trip package not found" });
    res.json({ tripPackage: normalizePackage(tripPackage) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch trip package" });
  }
};

exports.bookTripPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { guests = 1, addOnListingIds = [] } = req.body || {};
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid trip package id" });

    const tripPackage = await populatePackageQuery(TripPackage.findById(id).lean());
    if (!tripPackage || !tripPackage.isActive) return res.status(404).json({ message: "Trip package not found" });

    const numericGuests = Number(guests);
    if (Number.isNaN(numericGuests) || numericGuests < 1) {
      return res.status(400).json({ message: "Guests must be a positive number" });
    }
    if (tripPackage.minGuests && numericGuests < tripPackage.minGuests) {
      return res.status(400).json({ message: `Minimum guests is ${tripPackage.minGuests}` });
    }
    const maxAllowedGuests = Number(tripPackage.maxGuests || tripPackage.capacity || 1);
    if (maxAllowedGuests && numericGuests > maxAllowedGuests) {
      return res.status(400).json({ message: `Max allowed guests is ${maxAllowedGuests}` });
    }

    const allowedAddOns = new Set((tripPackage.addOnListings || []).map((item) => item._id?.toString?.() || item.toString()));
    const requestedAddOns = Array.isArray(addOnListingIds) ? addOnListingIds : [];
    const filteredAddOns = requestedAddOns.filter((item) => allowedAddOns.has(String(item)));

    const addOnListings = filteredAddOns.length
      ? await Listing.find({ _id: { $in: filteredAddOns }, isActive: true }).lean()
      : [];

    const addOnsPricing = addOnListings.map((item) => ({
      listingId: item._id,
      title: item.title,
      price: Number(item.pricePerUnit || item.pricing?.price || 0),
    }));
    const addOnTotal = addOnsPricing.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const basePrice = Number(tripPackage.discountPrice || tripPackage.basePrice || 0);
    const total = Number((basePrice + addOnTotal).toFixed(2));

    const startDate = new Date(tripPackage.startDate);
    const endDate = new Date(tripPackage.endDate);

    const booking = await Booking.create({
      userId: req.user._id,
      tripPackageId: tripPackage._id,
      addOnListingIds: addOnsPricing.map((item) => item.listingId),
      date: startDate,
      checkIn: startDate,
      checkOut: endDate,
      guests: numericGuests,
      bookingType: "trip",
      amount: total,
      currency: tripPackage.currency || "NPR",
      bookingStatus: "awaiting_payment",
      paymentStatus: "pending",
      pricingSnapshot: {
        unitPrice: basePrice,
        nights: 1,
        subtotal: basePrice,
        serviceFee: 0,
        tax: 0,
        total,
        basePrice,
        addOnTotal,
        addOns: addOnsPricing,
      },
      packageSnapshot: buildPackageSnapshot(tripPackage, addOnsPricing),
      notes: "",
    });

    await createNotification({
      recipient: req.user._id,
      type: "trip_booking_created",
      title: "Trip booking created",
      message: `Your trip package "${tripPackage.title}" is reserved. Complete payment to confirm.`,
      meta: { bookingId: booking._id, tripPackageId: tripPackage._id },
    });
    await notifyAdmins({
      type: "trip_booking_created",
      title: "Trip booking created",
      message: `${req.user.name || req.user.email} created a trip booking for "${tripPackage.title}".`,
      meta: { bookingId: booking._id, tripPackageId: tripPackage._id, userId: req.user._id },
    });

    if (canSendEmail(req.user)) {
      sendTripBookingCreatedEmail({
        email: req.user.email,
        customerName: req.user.name,
        bookingName: tripPackage.title,
        bookingId: String(booking._id),
        amount: booking.amount,
        currency: booking.currency || "NPR",
        bookingDate: booking.checkIn || booking.date,
        packageSnapshot: booking.packageSnapshot,
      }).catch((error) => {
        console.error("Failed to send trip booking email:", error);
      });
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate("tripPackageId")
      .populate("addOnListingIds", "title type pricePerUnit pricing");
    res.status(201).json({ booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to book trip package" });
  }
};
