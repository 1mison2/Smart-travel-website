const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { createNotification, notifyAdmins } = require("../utils/notificationService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const randomRef = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

const userCanAccessBooking = (booking, user) =>
  user?.role === "admin" || booking.userId?.toString() === user?._id?.toString();

exports.initiatePayment = async (req, res) => {
  try {
    const { bookingId, provider } = req.body || {};
    if (!bookingId || !provider) return res.status(400).json({ message: "bookingId and provider are required" });
    if (!["khalti", "esewa", "mock"].includes(provider)) {
      return res.status(400).json({ message: "Unsupported payment provider" });
    }
    if (!isValidObjectId(bookingId)) return res.status(400).json({ message: "Invalid booking id" });

    const booking = await Booking.findById(bookingId).populate("locationId", "name");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!userCanAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({ message: "Cannot pay for cancelled booking" });
    }
    if (booking.paymentStatus === "paid") {
      return res.status(409).json({ message: "Booking already paid" });
    }

    const gatewayRef =
      provider === "khalti" ? randomRef("khalti_pidx") : provider === "esewa" ? randomRef("esewa_txn") : randomRef("mock_txn");

    const payment = await Payment.create({
      bookingId: booking._id,
      userId: booking.userId,
      provider,
      amount: booking.amount,
      currency: "NPR",
      gatewayRef,
      status: "initiated",
      rawRequest: req.body || {},
      rawResponse: {
        note: "Sandbox initiation placeholder. Replace with actual provider init API response.",
      },
    });

    booking.paymentProvider = provider;
    booking.paymentId = String(payment._id);
    booking.paymentStatus = "pending";
    await booking.save();

    await createNotification({
      recipient: booking.userId,
      type: "payment_initiated",
      title: "Payment initiated",
      message: `Payment started for booking at ${booking.locationId?.name || "selected location"}.`,
      meta: { bookingId: booking._id, paymentId: payment._id, provider },
    });
    await notifyAdmins({
      type: "payment_initiated",
      title: "User initiated payment",
      message: `${req.user.name || req.user.email} initiated ${provider.toUpperCase()} payment.`,
      meta: { bookingId: booking._id, paymentId: payment._id, provider },
    });

    const redirectUrl =
      provider === "khalti"
        ? "https://dev.khalti.com/"
        : provider === "esewa"
        ? "https://rc-epay.esewa.com.np/"
        : "";

    res.status(201).json({
      payment,
      redirectUrl,
      nextStep:
        provider === "mock"
          ? "Call /api/payments/verify with success=true to complete local sandbox flow."
          : "Complete payment on provider sandbox UI, then verify from backend callback or manual verify API.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to initiate payment" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId, gatewayRef, success = true, providerPayload = {} } = req.body || {};
    if (!paymentId) return res.status(400).json({ message: "paymentId is required" });
    if (!isValidObjectId(paymentId)) return res.status(400).json({ message: "Invalid payment id" });

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const booking = await Booking.findById(payment.bookingId).populate("locationId", "name");
    if (!booking) return res.status(404).json({ message: "Booking not found for payment" });
    if (!userCanAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });

    if (payment.status === "success" && booking.paymentStatus === "paid") {
      return res.json({ message: "Payment already verified", payment, booking });
    }

    const verifiedSuccess = Boolean(success);
    payment.status = verifiedSuccess ? "success" : "failed";
    payment.verifiedAt = new Date();
    if (gatewayRef) payment.gatewayRef = String(gatewayRef);
    payment.rawResponse = {
      ...payment.rawResponse,
      providerPayload,
      verifiedBy: req.user._id,
      verifiedSuccess,
    };
    await payment.save();

    booking.paymentId = String(payment._id);
    booking.paymentStatus = verifiedSuccess ? "paid" : "failed";
    booking.bookingStatus = verifiedSuccess ? "confirmed" : "pending";
    if (verifiedSuccess) booking.paidAt = new Date();
    await booking.save();

    const notificationType = verifiedSuccess ? "payment_success" : "payment_failed";
    await createNotification({
      recipient: booking.userId,
      type: notificationType,
      title: verifiedSuccess ? "Payment successful" : "Payment failed",
      message: verifiedSuccess
        ? `Booking for ${booking.locationId?.name || "selected location"} is now confirmed.`
        : `Payment verification failed for your booking at ${booking.locationId?.name || "selected location"}.`,
      meta: { bookingId: booking._id, paymentId: payment._id },
    });
    await notifyAdmins({
      type: notificationType,
      title: verifiedSuccess ? "Booking paid" : "Payment failed",
      message: verifiedSuccess
        ? `${req.user.name || req.user.email} completed booking payment.`
        : `${req.user.name || req.user.email} payment verification failed.`,
      meta: { bookingId: booking._id, paymentId: payment._id },
    });

    res.json({ payment, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to verify payment" });
  }
};

exports.getMyPayments = async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { userId: req.user._id };
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .populate("bookingId", "amount bookingStatus paymentStatus date")
      .limit(100);
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};
