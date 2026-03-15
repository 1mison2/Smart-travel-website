const mongoose = require("mongoose");
const TripPackage = require("../models/TripPackage");
const Listing = require("../models/Listing");
const Booking = require("../models/Booking");
const { createNotification, notifyAdmins } = require("../utils/notificationService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizePackage = (pkg) => ({
  ...pkg,
  addOnListings: Array.isArray(pkg.addOnListings) ? pkg.addOnListings : [],
});

exports.getTripPackages = async (_req, res) => {
  try {
    const packages = await TripPackage.find({ isActive: true })
      .sort({ startDate: 1 })
      .populate("addOnListings", "title type pricePerUnit pricing isActive")
      .lean();
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
    const tripPackage = await TripPackage.findById(id)
      .populate("addOnListings", "title type pricePerUnit pricing isActive")
      .lean();
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

    const tripPackage = await TripPackage.findById(id).lean();
    if (!tripPackage || !tripPackage.isActive) return res.status(404).json({ message: "Trip package not found" });

    const numericGuests = Number(guests);
    if (Number.isNaN(numericGuests) || numericGuests < 1) {
      return res.status(400).json({ message: "Guests must be a positive number" });
    }
    if (tripPackage.capacity && numericGuests > tripPackage.capacity) {
      return res.status(400).json({ message: `Max allowed guests is ${tripPackage.capacity}` });
    }

    const allowedAddOns = new Set((tripPackage.addOnListings || []).map((item) => item.toString()));
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
    const basePrice = Number(tripPackage.basePrice || 0);
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
      bookingStatus: "confirmed",
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
      notes: "",
    });

    await createNotification({
      recipient: req.user._id,
      type: "trip_booking_created",
      title: "Trip booked",
      message: `Your trip package "${tripPackage.title}" has been booked.`,
      meta: { bookingId: booking._id, tripPackageId: tripPackage._id },
    });
    await notifyAdmins({
      type: "trip_booking_created",
      title: "Trip package booked",
      message: `${req.user.name || req.user.email} booked trip package "${tripPackage.title}".`,
      meta: { bookingId: booking._id, tripPackageId: tripPackage._id, userId: req.user._id },
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("tripPackageId")
      .populate("addOnListingIds", "title type pricePerUnit pricing");
    res.status(201).json({ booking: populatedBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to book trip package" });
  }
};
