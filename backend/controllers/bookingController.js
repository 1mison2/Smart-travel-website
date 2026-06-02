const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Location = require("../models/Location");
const Listing = require("../models/Listing");
const { createNotification, notifyAdmins } = require("../utils/notificationService");
const {
  isSingleSessionBookingType,
  calculateNights,
  buildPriceBreakdown,
} = require("../utils/bookingPricing");
const {
  canSendEmail,
  sendBookingCancelledEmail,
  sendBookingCreatedEmail,
} = require("../utils/emailService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const canAccessBooking = (booking, user) => {
  if (user?.role === "admin") return true;
  const bookingUserId =
    booking?.userId?._id?.toString?.() || booking?.userId?.toString?.() || "";
  return bookingUserId === user?._id?.toString?.();
};

const getBookingEndDate = (booking) =>
  booking?.checkOut || booking?.packageSnapshot?.endDate || booking?.checkIn || booking?.date || null;

const hasBookingEnded = (booking, now = new Date()) => {
  const endDate = new Date(getBookingEndDate(booking));
  if (Number.isNaN(endDate.getTime())) return false;
  endDate.setHours(23, 59, 59, 999);
  return endDate < now;
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
    const pricing = buildPriceBreakdown({
      unitPrice,
      nights,
      guests: numericGuests,
      chargeGuests: isSingleSession,
    });

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
      const pricing = buildPriceBreakdown({
        unitPrice,
        nights,
        guests: numericGuests,
        chargeGuests: isSingleSession,
      });

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
        bookingStatus: "awaiting_payment",
        paymentStatus: "pending",
        notes: String(notes || "").trim(),
      });

      await createNotification({
        recipient: req.user._id,
        type: "booking_created",
        title: "Booking created",
        message: `Booking created for ${listing.title}. Complete payment to confirm.`,
        meta: { bookingId: booking._id, listingId: listing._id },
      });
      await notifyAdmins({
        type: "booking_created",
        title: "New booking created",
        message: `${req.user.name || req.user.email} created a booking for ${listing.title}.`,
        meta: { bookingId: booking._id, userId: req.user._id, listingId: listing._id },
      });

      if (canSendEmail(req.user)) {
        sendBookingCreatedEmail({
          email: req.user.email,
          customerName: req.user.name,
          bookingName: listing.title,
          bookingId: String(booking._id),
          amount: booking.amount,
          currency: booking.currency || "NPR",
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
        }).catch((error) => {
          console.error("Failed to send booking created email:", error);
        });
      }

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
      bookingStatus: "awaiting_payment",
      paymentStatus: "pending",
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
      message: `Your booking for ${location.name} is created. Complete payment to confirm.`,
      meta: { bookingId: legacyBooking._id, locationId: location._id },
    });
    await notifyAdmins({
      type: "booking_created",
      title: "New booking request",
      message: `${req.user.name || req.user.email} created a booking for ${location.name}.`,
      meta: { bookingId: legacyBooking._id, userId: req.user._id, locationId: location._id },
    });

    if (canSendEmail(req.user)) {
      sendBookingCreatedEmail({
        email: req.user.email,
        customerName: req.user.name,
        bookingName: location.name,
        bookingId: String(legacyBooking._id),
        amount: legacyBooking.amount,
        currency: legacyBooking.currency || "NPR",
        checkIn: legacyBooking.checkIn || legacyBooking.date,
        checkOut: legacyBooking.checkOut || legacyBooking.date,
      }).catch((error) => {
        console.error("Failed to send booking created email:", error);
      });
    }

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
      .populate("listingId", "title type location photos rating pricePerUnit")
      .populate("tripPackageId")
      .populate("addOnListingIds", "title type pricePerUnit pricing");
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
      .populate("tripPackageId")
      .populate("addOnListingIds", "title type pricePerUnit pricing")
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
      .populate("listingId", "title")
      .populate("tripPackageId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!canAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (hasBookingEnded(booking)) {
      return res.status(400).json({ message: "This trip has already ended and can no longer be cancelled" });
    }
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Paid booking cannot be cancelled from this action" });
    }
    if (booking.bookingStatus === "cancelled") return res.json({ booking });

    booking.bookingStatus = "cancelled";
    booking.cancelledAt = new Date();
    await booking.save();

    const bookingName =
      booking.tripPackageId?.title ||
      booking.listingId?.title ||
      booking.locationId?.name ||
      "selected place";
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

    if (canSendEmail(req.user)) {
      sendBookingCancelledEmail({
        email: req.user.email,
        customerName: req.user.name,
        bookingName,
        bookingId: String(booking._id),
        cancelledAt: booking.cancelledAt,
      }).catch((error) => {
        console.error("Failed to send booking cancelled email:", error);
      });
    }

    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
};

exports.requestRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim();
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id" });

    const booking = await Booking.findById(id)
      .populate("locationId", "name")
      .populate("listingId", "title")
      .populate("tripPackageId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!canAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (hasBookingEnded(booking)) {
      return res.status(400).json({ message: "This trip has already ended and is no longer eligible for refund requests" });
    }
    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Only paid bookings can request a refund" });
    }
    if (booking.paymentStatus === "refunded" || booking.refundRequestStatus === "approved") {
      return res.status(400).json({ message: "This booking has already been refunded" });
    }
    if (booking.refundRequestStatus === "requested") {
      return res.status(400).json({ message: "A refund request is already pending review" });
    }

    booking.refundRequestStatus = "requested";
    booking.refundReason = reason;
    booking.refundDecisionNote = "";
    booking.refundRequestedAt = new Date();
    booking.refundReviewedAt = undefined;
    await booking.save();

    const bookingName =
      booking.tripPackageId?.title ||
      booking.listingId?.title ||
      booking.locationId?.name ||
      "selected booking";

    await createNotification({
      recipient: booking.userId,
      type: "refund_requested",
      title: "Refund request submitted",
      message: `Your refund request for ${bookingName} was sent for admin review.`,
      meta: { bookingId: booking._id, refundRequestStatus: booking.refundRequestStatus },
    });
    await notifyAdmins({
      type: "refund_requested",
      title: "Refund request received",
      message: `${req.user.name || req.user.email} requested a refund for ${bookingName}.`,
      meta: { bookingId: booking._id, userId: req.user._id, reason },
    });

    res.json({ message: "Refund request submitted successfully", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit refund request" });
  }
};
