const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Location = require("../models/Location");
const Listing = require("../models/Listing");
const { createNotification, notifyAdmins } = require("../utils/notificationService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const canAccessBooking = (booking, user) =>
  user?.role === "admin" || booking.userId?.toString() === user?._id?.toString();

const createPaymentReference = () =>
  `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const isSingleSessionBookingType = (type) => ["activity", "cafe", "restaurant"].includes(type);

const calculateNights = (checkIn, checkOut) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.ceil((checkOut - checkIn) / dayMs);
  return diff > 0 ? diff : 1;
};

const buildPriceBreakdown = ({ unitPrice, nights }) => {
  const subtotal = Number((unitPrice * nights).toFixed(2));
  const serviceFee = Number((subtotal * 0.08).toFixed(2));
  const tax = Number((subtotal * 0.13).toFixed(2));
  const total = Number((subtotal + serviceFee + tax).toFixed(2));
  return { unitPrice, nights, subtotal, serviceFee, tax, total };
};

exports.quoteBooking = async (req, res) => {
  try {
    const { listingId, checkIn, checkOut, guests = 1 } = req.body || {};
    if (!listingId || !checkIn || !checkOut) {
      return res.status(400).json({ message: "listingId, checkIn and checkOut are required" });
    }
    if (!isValidObjectId(listingId)) return res.status(400).json({ message: "Invalid listing id" });

    const listing = await Listing.findById(listingId).lean();
    if (!listing || !listing.isActive) return res.status(404).json({ message: "Listing not found" });

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) {
      return res.status(400).json({ message: "Invalid check-in/check-out date" });
    }
    const isSingleSession = isSingleSessionBookingType(listing.type);
    if (isSingleSession ? outDate < inDate : outDate <= inDate) {
      return res
        .status(400)
        .json({ message: isSingleSession ? "Check-out cannot be before check-in" : "Check-out must be after check-in" });
    }

    const numericGuests = Number(guests);
    if (Number.isNaN(numericGuests) || numericGuests < 1) {
      return res.status(400).json({ message: "Guests must be a positive number" });
    }
    if (listing.capacity && numericGuests > listing.capacity) {
      return res
        .status(400)
        .json({ message: `Max allowed guests for this listing is ${listing.capacity}` });
    }

    const nights = isSingleSession || listing.pricing?.model === "fixed" ? 1 : calculateNights(inDate, outDate);
    const unitPrice = Number(listing.pricePerUnit || listing.pricing?.price || 0);
    const pricing = buildPriceBreakdown({ unitPrice, nights });

    return res.json({
      quote: {
        listingId,
        checkIn: inDate,
        checkOut: outDate,
        guests: numericGuests,
        currency: listing.pricing?.currency || "NPR",
        pricing,
      },
      listing: {
        _id: listing._id,
        title: listing.title,
        type: listing.type,
        location: listing.location,
        capacity: listing.capacity,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to generate booking quote" });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const {
      listingId,
      checkIn,
      checkOut,
      guests = 1,
      notes = "",
      locationId,
      date,
      amount,
    } = req.body || {};

    // Preferred modern flow: listing-based booking
    if (listingId) {
      if (!isValidObjectId(listingId)) return res.status(400).json({ message: "Invalid listing id" });
      const listing = await Listing.findById(listingId);
      if (!listing || !listing.isActive) return res.status(404).json({ message: "Listing not found" });

      const inDate = new Date(checkIn);
      const outDate = new Date(checkOut);
      const isSingleSession = isSingleSessionBookingType(listing.type);
      if (
        Number.isNaN(inDate.getTime()) ||
        Number.isNaN(outDate.getTime()) ||
        (isSingleSession ? outDate < inDate : outDate <= inDate)
      ) {
        return res
          .status(400)
          .json({ message: isSingleSession ? "Provide valid reservation dates" : "Provide valid check-in and check-out dates" });
      }

      const numericGuests = Number(guests);
      if (Number.isNaN(numericGuests) || numericGuests < 1) {
        return res.status(400).json({ message: "Guests must be a positive number" });
      }
      if (listing.capacity && numericGuests > listing.capacity) {
        return res
          .status(400)
          .json({ message: `Max allowed guests for this listing is ${listing.capacity}` });
      }

      const nights = isSingleSession || listing.pricing?.model === "fixed" ? 1 : calculateNights(inDate, outDate);
      const unitPrice = Number(listing.pricePerUnit || listing.pricing?.price || 0);
      const pricing = buildPriceBreakdown({ unitPrice, nights });

      const booking = await Booking.create({
        userId: req.user._id,
        listingId: listing._id,
        date: inDate,
        checkIn: inDate,
        checkOut: outDate,
        guests: numericGuests,
        bookingType: ["activity", "cafe", "restaurant"].includes(listing.type) ? listing.type : "hotel",
        amount: pricing.total,
        currency: listing.pricing?.currency || "NPR",
        pricingSnapshot: pricing,
        bookingStatus: "confirmed",
        notes: String(notes || "").trim(),
      });

      await createNotification({
        recipient: req.user._id,
        type: "booking_created",
        title: "Booking created",
        message: `Booking confirmed for ${listing.title}.`,
        meta: { bookingId: booking._id, listingId: listing._id },
      });
      await notifyAdmins({
        type: "booking_created",
        title: "New booking created",
        message: `${req.user.name || req.user.email} created a booking for ${listing.title}.`,
        meta: { bookingId: booking._id, userId: req.user._id, listingId: listing._id },
      });

      const populatedBooking = await Booking.findById(booking._id).populate(
        "listingId",
        "title type location pricePerUnit photos rating"
      );
      return res.status(201).json({ booking: populatedBooking });
    }

    // Legacy fallback flow for existing location bookings
    if (!locationId || !date || amount === undefined) {
      return res
        .status(400)
        .json({ message: "Use listingId flow or provide locationId, date and amount" });
    }
    if (!isValidObjectId(locationId)) return res.status(400).json({ message: "Invalid location id" });

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ message: "Amount must be a valid non-negative number" });
    }
    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      return res.status(400).json({ message: "Invalid booking date" });
    }

    const location = await Location.findById(locationId).select("_id name");
    if (!location) return res.status(404).json({ message: "Location not found" });

    const legacyBooking = await Booking.create({
      userId: req.user._id,
      locationId,
      date: bookingDate,
      amount: numericAmount,
      bookingType: "legacy",
      bookingStatus: "confirmed",
      notes: String(notes || "").trim(),
      pricingSnapshot: {
        unitPrice: numericAmount,
        nights: 1,
        subtotal: numericAmount,
        serviceFee: 0,
        tax: 0,
        total: numericAmount,
      },
    });

    await createNotification({
      recipient: req.user._id,
      type: "booking_created",
      title: "Booking created",
      message: `Your booking for ${location.name} is confirmed.`,
      meta: { bookingId: legacyBooking._id, locationId: location._id },
    });
    await notifyAdmins({
      type: "booking_created",
      title: "New booking request",
      message: `${req.user.name || req.user.email} created a booking for ${location.name}.`,
      meta: { bookingId: legacyBooking._id, userId: req.user._id, locationId: location._id },
    });

    const populatedBooking = await Booking.findById(legacyBooking._id).populate(
      "locationId",
      "name province district"
    );
    return res.status(201).json({ booking: populatedBooking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create booking" });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("locationId", "name province district image")
      .populate("listingId", "title type location photos rating pricePerUnit");
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch your bookings" });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id" });

    const booking = await Booking.findById(id)
      .populate("locationId", "name province district image")
      .populate("listingId", "title type location photos rating pricePerUnit")
      .populate("userId", "name email role");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!canAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });

    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch booking" });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id" });

    const booking = await Booking.findById(id)
      .populate("locationId", "name")
      .populate("listingId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!canAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Paid booking cannot be cancelled from this action" });
    }
    if (booking.bookingStatus === "cancelled") return res.json({ booking });

    booking.bookingStatus = "cancelled";
    booking.cancelledAt = new Date();
    await booking.save();

    const bookingName = booking.listingId?.title || booking.locationId?.name || "selected place";
    await createNotification({
      recipient: booking.userId,
      type: "booking_cancelled",
      title: "Booking cancelled",
      message: `Your booking for ${bookingName} was cancelled.`,
      meta: { bookingId: booking._id },
    });
    await notifyAdmins({
      type: "booking_cancelled",
      title: "Booking cancelled",
      message: `A booking was cancelled by ${req.user.name || req.user.email}.`,
      meta: { bookingId: booking._id, userId: req.user._id },
    });

    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};

exports.initiateBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentProvider = "mock", paymentReference } = req.body || {};

    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id" });
    const booking = await Booking.findById(id).populate("locationId", "name").populate("listingId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!canAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({ message: "Cannot pay for a cancelled booking" });
    }
    if (booking.paymentStatus === "paid") {
      return res.status(409).json({ message: "Booking is already paid", booking });
    }
    if (!["mock", "khalti", "esewa", "stripe", "paypal"].includes(paymentProvider)) {
      return res.status(400).json({ message: "Unsupported payment provider" });
    }

    const paymentId = String(paymentReference || createPaymentReference()).trim();
    booking.paymentProvider = paymentProvider;
    booking.paymentId = paymentId;
    booking.paymentStatus = "pending";
    booking.bookingStatus = "awaiting_payment";
    await booking.save();

    const bookingName = booking.listingId?.title || booking.locationId?.name || "selected place";
    await createNotification({
      recipient: booking.userId,
      type: "payment_initiated",
      title: "Payment initiated",
      message: `Payment started for booking at ${bookingName}.`,
      meta: { bookingId: booking._id, paymentId, provider: paymentProvider },
    });
    await notifyAdmins({
      type: "payment_initiated",
      title: "Payment initiated",
      message: `${req.user.name || req.user.email} initiated booking payment.`,
      meta: { bookingId: booking._id, paymentId, provider: paymentProvider },
    });

    res.json({
      message: "Payment initiated",
      payment: {
        paymentId,
        provider: paymentProvider,
        amount: booking.amount,
        currency: booking.currency || "NPR",
      },
      booking,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to initiate payment" });
  }
};

exports.confirmBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentId, success = true } = req.body || {};

    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id" });
    const booking = await Booking.findById(id).populate("locationId", "name").populate("listingId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!canAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({ message: "Cannot confirm payment for cancelled booking" });
    }

    const cleanPaymentId = String(paymentId || booking.paymentId || "").trim();
    if (!cleanPaymentId) return res.status(400).json({ message: "paymentId is required" });

    if (booking.paymentStatus === "paid") {
      if (booking.paymentId === cleanPaymentId) {
        return res.json({ message: "Payment already confirmed", booking });
      }
      return res.status(409).json({ message: "Booking already paid with a different payment id" });
    }

    booking.paymentId = cleanPaymentId;
    if (success) {
      booking.paymentStatus = "paid";
      booking.paidAt = new Date();
      booking.bookingStatus = "confirmed";
    } else {
      booking.paymentStatus = "failed";
      booking.bookingStatus = "awaiting_payment";
    }
    await booking.save();

    const bookingName = booking.listingId?.title || booking.locationId?.name || "selected place";
    const type = success ? "payment_success" : "payment_failed";
    const title = success ? "Payment successful" : "Payment failed";
    const message = success
      ? `Your booking for ${bookingName} is confirmed.`
      : `Payment failed for booking at ${bookingName}.`;

    await createNotification({
      recipient: booking.userId,
      type,
      title,
      message,
      meta: { bookingId: booking._id, paymentId: cleanPaymentId },
    });
    await notifyAdmins({
      type,
      title,
      message: success
        ? `${req.user.name || req.user.email} completed a booking payment.`
        : `${req.user.name || req.user.email} had a failed booking payment.`,
      meta: { bookingId: booking._id, paymentId: cleanPaymentId },
    });

    res.json({ message: title, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
};
