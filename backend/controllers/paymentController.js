const mongoose = require("mongoose");
const axios = require("axios");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { createNotification, notifyAdmins } = require("../utils/notificationService");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const userCanAccessBooking = (booking, user) =>
  user?.role === "admin" || booking.userId?.toString() === user?._id?.toString();

const toPaisa = (amount) => Math.round(Number(amount || 0) * 100);

const normalizeBaseUrl = (value) => String(value || "").replace(/\/+$/, "/");

const resolveKhaltiBaseUrl = () => {
  if (process.env.KHALTI_BASE_URL) return normalizeBaseUrl(process.env.KHALTI_BASE_URL);
  const mode = String(process.env.KHALTI_MODE || "").toLowerCase();
  if (mode === "test") return "https://dev.khalti.com/api/v2/";
  return "https://khalti.com/api/v2/";
};

const resolveKhaltiInitiateUrl = () => `${resolveKhaltiBaseUrl()}epayment/initiate/`;

const resolveKhaltiLookupUrl = () => `${resolveKhaltiBaseUrl()}epayment/lookup/`;

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

exports.initiateKhaltiPayment = async (req, res) => {
  try {
    const { bookingId, returnUrl, websiteUrl } = req.body || {};
    if (!bookingId) return res.status(400).json({ message: "bookingId is required" });
    if (!isValidObjectId(bookingId)) return res.status(400).json({ message: "Invalid booking id" });

    const booking = await Booking.findById(bookingId)
      .populate("locationId", "name")
      .populate("listingId", "title")
      .populate("tripPackageId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!userCanAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({ message: "Cannot pay for cancelled booking" });
    }
    if (booking.paymentStatus === "paid") {
      return res.status(409).json({ message: "Booking already paid", booking });
    }

    if (!returnUrl) {
      return res.status(400).json({ message: "returnUrl is required" });
    }

    const secretKey = process.env.KHALTI_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ message: "Khalti secret key is not configured" });
    }

    const expectedAmount = toPaisa(booking.amount);
    const bookingName =
      booking.tripPackageId?.title ||
      booking.listingId?.title ||
      booking.locationId?.name ||
      "Smart Travel Booking";

    let khaltiResponse;
    try {
      khaltiResponse = await axios.post(
        resolveKhaltiInitiateUrl(),
        {
          return_url: returnUrl,
          website_url: websiteUrl || req.get("origin") || req.get("referer") || "http://localhost:5173",
          amount: expectedAmount,
          purchase_order_id: String(booking._id),
          purchase_order_name: bookingName,
          customer_info: {
            name: req.user?.name || req.user?.email || "Smart Travel Customer",
            email: req.user?.email || "",
            phone: req.user?.phone || "",
          },
        },
        { headers: { Authorization: `Key ${secretKey}` } }
      );
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      return res.status(status || 400).json({
        message: "Khalti initiation failed",
        details: data || err.message,
      });
    }

    const responseData = khaltiResponse?.data || {};
    const pidx = responseData?.pidx || "";

    const payment = await Payment.create({
      bookingId: booking._id,
      userId: booking.userId,
      provider: "khalti",
      amount: booking.amount,
      currency: booking.currency || "NPR",
      gatewayRef: pidx,
      status: "initiated",
      rawRequest: {
        bookingId,
        returnUrl,
        websiteUrl: websiteUrl || req.get("origin") || req.get("referer") || "http://localhost:5173",
        amount: expectedAmount,
      },
      rawResponse: responseData,
      verifiedAt: new Date(),
    });

    booking.paymentProvider = "khalti";
    booking.paymentId = String(payment._id);
    booking.paymentStatus = "pending";
    booking.bookingStatus = "awaiting_payment";
    booking.khaltiToken = pidx;
    await booking.save();

    return res.json({
      message: "Payment initiated successfully",
      paymentUrl: responseData?.payment_url || "",
      pidx,
      booking,
      payment,
      khalti: responseData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to initiate Khalti payment" });
  }
};

exports.verifyKhaltiPayment = async (req, res) => {
  try {
    const { bookingId, pidx } = req.body || {};
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }
    if (!isValidObjectId(bookingId)) return res.status(400).json({ message: "Invalid booking id" });

    const booking = await Booking.findById(bookingId)
      .populate("locationId", "name")
      .populate("listingId", "title")
      .populate("tripPackageId", "title");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!userCanAccessBooking(booking, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({ message: "Cannot pay for cancelled booking" });
    }

    const lookupPidx = pidx || booking.khaltiToken;
    if (!lookupPidx) {
      return res.status(400).json({ message: "pidx is required for verification" });
    }

    const secretKey = process.env.KHALTI_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ message: "Khalti secret key is not configured" });
    }

    let khaltiResponse;
    try {
      khaltiResponse = await axios.post(
        resolveKhaltiLookupUrl(),
        { pidx: lookupPidx },
        { headers: { Authorization: `Key ${secretKey}` } }
      );
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      return res.status(status || 400).json({
        message: "Khalti lookup failed",
        details: data || err.message,
      });
    }

    const responseData = khaltiResponse?.data || {};
    const status = String(responseData?.status || "");
    const totalAmount = Number(responseData?.total_amount);
    const expectedAmount = toPaisa(booking.amount);
    if (!Number.isNaN(totalAmount) && totalAmount !== expectedAmount) {
      return res.status(400).json({
        message: "Amount mismatch for verification",
        expectedAmount,
        providedAmount: totalAmount,
      });
    }

    let payment = null;
    if (booking.paymentId) {
      payment = await Payment.findById(booking.paymentId).catch(() => null);
    }
    if (!payment) {
      payment = await Payment.findOne({ bookingId: booking._id, gatewayRef: lookupPidx }).catch(() => null);
    }
    if (!payment) {
      payment = await Payment.create({
        bookingId: booking._id,
        userId: booking.userId,
        provider: "khalti",
        amount: booking.amount,
        currency: booking.currency || "NPR",
        gatewayRef: lookupPidx,
        status: "initiated",
        rawRequest: { bookingId, pidx: lookupPidx },
        rawResponse: responseData,
        verifiedAt: new Date(),
      });
    }

    payment.rawResponse = responseData;
    payment.verifiedAt = new Date();

    const normalized = status.toLowerCase();
    if (normalized === "completed") {
      payment.status = "success";
      payment.gatewayRef = responseData?.transaction_id || responseData?.tidx || lookupPidx;

      booking.paymentProvider = "khalti";
      booking.paymentId = String(payment._id);
      booking.paymentStatus = "paid";
      booking.bookingStatus = "confirmed";
      booking.paidAt = new Date();
      booking.khaltiToken = lookupPidx;
      booking.transactionId = responseData?.transaction_id || responseData?.tidx || "";

      const bookingName =
        booking.tripPackageId?.title ||
        booking.listingId?.title ||
        booking.locationId?.name ||
        "selected place";
      await createNotification({
        recipient: booking.userId,
        type: "payment_success",
        title: "Payment successful",
        message: `Your booking for ${bookingName} is confirmed.`,
        meta: { bookingId: booking._id, paymentId: payment._id },
      });
      await notifyAdmins({
        type: "payment_success",
        title: "Booking paid",
        message: `${req.user.name || req.user.email} completed a Khalti payment.`,
        meta: { bookingId: booking._id, paymentId: payment._id },
      });
    } else if (normalized === "pending" || normalized === "initiated") {
      payment.status = "initiated";
      booking.paymentProvider = "khalti";
      booking.paymentId = String(payment._id);
      booking.paymentStatus = "pending";
      booking.bookingStatus = "awaiting_payment";
      booking.khaltiToken = lookupPidx;
    } else if (normalized === "refunded" || normalized === "partially refunded") {
      payment.status = "refunded";
      booking.paymentProvider = "khalti";
      booking.paymentId = String(payment._id);
      booking.paymentStatus = "refunded";
      booking.bookingStatus = "awaiting_payment";
      booking.khaltiToken = lookupPidx;
    } else {
      payment.status = "failed";
      booking.paymentProvider = "khalti";
      booking.paymentId = String(payment._id);
      booking.paymentStatus = "failed";
      booking.bookingStatus = "awaiting_payment";
      booking.khaltiToken = lookupPidx;
    }

    await payment.save();
    await booking.save();

    return res.json({
      message: `Payment status: ${status || "Unknown"}`,
      booking,
      payment,
      khalti: responseData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to verify Khalti payment" });
  }
};
