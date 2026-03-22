import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const getReturnUrl = (bookingId) => {
  if (typeof window === "undefined") return "";
  const base = window.location.origin;
  return `${base}/payment?bookingId=${bookingId}`;
};

const resolvePaymentBadge = (status) => {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "paid" || normalized === "success") return "payment-badge payment-badge--success";
  if (normalized === "failed") return "payment-badge payment-badge--danger";
  if (normalized === "refunded") return "payment-badge payment-badge--info";
  return "payment-badge payment-badge--warning";
};

export default function PaymentPage() {
  const { token } = useAuth();
  const location = useLocation();
  const bookingId = useMemo(
    () => new URLSearchParams(location.search).get("bookingId") || "",
    [location.search]
  );
  const callbackParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      pidx: params.get("pidx") || "",
      status: params.get("status") || "",
      transactionId: params.get("transaction_id") || params.get("tidx") || "",
    };
  }, [location.search]);

  const [booking, setBooking] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  const fetchBooking = async () => {
    if (!bookingId) return;
    try {
      setBookingLoading(true);
      setBookingError("");
      const { data } = await api.get(`/api/bookings/${bookingId}`);
      setBooking(data?.booking || null);
      if (!data?.booking) setBookingError("Booking not found for this ID.");
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Failed to fetch booking";
      setBookingError(status ? `${message} (HTTP ${status})` : message);
      setBooking(null);
    } finally {
      setBookingLoading(false);
    }
  };

  const verifyPayment = async (pidx) => {
    if (!bookingId || !pidx) return;
    try {
      setPaying(true);
      setActionError("");
      setMessage("Verifying payment with Khalti...");
      const { data } = await api.post("/verify-payment", { bookingId, pidx });
      setMessage(data?.message || "Payment verification completed.");
      await fetchBooking();
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Failed to verify payment";
      setActionError(status ? `${message} (HTTP ${status})` : message);
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  useEffect(() => {
    if (!callbackParams.pidx || hasVerified) return;
    if (callbackParams.status && callbackParams.status.toLowerCase().includes("canceled")) {
      setActionError("Payment was canceled. You can try again.");
      setHasVerified(true);
      return;
    }
    setHasVerified(true);
    verifyPayment(callbackParams.pidx);
  }, [callbackParams.pidx, callbackParams.status, hasVerified]);

  const startPayment = async () => {
    if (!bookingId) return;
    if (!booking) {
      setActionError("Load booking first before initiating payment.");
      return;
    }
    if (!token) {
      setActionError("You are not logged in. Please log in again to continue payment.");
      return;
    }
    if (booking?.paymentStatus === "paid") {
      setActionError("This booking is already paid.");
      return;
    }

    try {
      setPaying(true);
      setActionError("");
      setMessage("Redirecting to Khalti...");
      const returnUrl = getReturnUrl(bookingId);
      const { data } = await api.post("/initiate-payment", {
        bookingId,
        returnUrl,
        websiteUrl: window.location.origin,
      });
      const paymentUrl = data?.paymentUrl || data?.khalti?.payment_url || "";
      if (!paymentUrl) {
        throw new Error("Khalti did not return a payment URL.");
      }
      window.location.href = paymentUrl;
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || "Failed to initiate payment";
      setActionError(status ? `${message} (HTTP ${status})` : message);
    } finally {
      setPaying(false);
    }
  };

  const paymentStatus = booking?.paymentStatus || "pending";
  const bookingName =
    booking?.tripPackageId?.title ||
    booking?.listingId?.title ||
    booking?.locationId?.name ||
    "Smart Travel Booking";

  return (
    <div className="travel-shell payment-shell">
      <div className="travel-container" style={{ maxWidth: 1050 }}>
        <header className="travel-hero payment-hero">
          <div>
            <p className="travel-kicker">Secure Payment</p>
            <h1 className="travel-title" style={{ fontSize: "2.1rem", marginTop: "8px" }}>
              Complete your booking payment
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Booking ID: <span className="font-mono">{bookingId || "Missing"}</span>
            </p>
          </div>
          <div className="payment-steps">
            <span className="payment-step is-active">Review</span>
            <span className="payment-step is-active">Pay</span>
            <span className="payment-step">Confirm</span>
          </div>
        </header>

        <section className="travel-grid-2 payment-grid" style={{ marginTop: "18px" }}>
          <div className="travel-card payment-card" style={{ padding: "18px" }}>
            <div className="payment-card__head">
              <div>
                <h2 className="text-lg font-semibold">Khalti payment</h2>
                <p className="mt-1 text-sm text-slate-600">
                  You will be redirected to Khalti to complete this payment securely.
                </p>
              </div>
              <span className="payment-provider">Khalti</span>
            </div>

            <div className="payment-highlight">
              <div>
                <p className="payment-label">Amount due</p>
                <p className="payment-amount">NPR {booking?.amount ?? "--"}</p>
                <p className="payment-sub">Booking: {bookingName}</p>
              </div>
              <div className="payment-status">
                <span className={resolvePaymentBadge(paymentStatus)}>{paymentStatus}</span>
                <p className="payment-sub">Status updates after verification.</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={startPayment}
                disabled={
                  paying ||
                  bookingLoading ||
                  !bookingId ||
                  !booking ||
                  !token ||
                  booking?.paymentStatus === "paid"
                }
                className="travel-btn travel-btn-primary payment-cta"
              >
                {paying ? "Processing..." : "Pay with Khalti"}
              </button>
              <Link to="/bookings" className="travel-btn travel-btn-soft payment-ghost">
                View bookings
              </Link>
            </div>

            {message && <p className="travel-alert travel-alert-success">{message}</p>}
            {actionError && <p className="travel-alert travel-alert-error">{actionError}</p>}
            {!token && (
              <p className="travel-alert travel-alert-error">
                You are not logged in. Please log in again to continue payment.
              </p>
            )}

            <div className="payment-note">
              <h3>What happens next</h3>
              <ul>
                <li>We redirect you to Khalti’s secure checkout.</li>
                <li>After payment, you return here for instant verification.</li>
                <li>We confirm and update your booking status automatically.</li>
              </ul>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-3 text-xs text-slate-500">
                <p>Debug: return_url = {getReturnUrl(bookingId) || "-"}</p>
                <p>Debug: pidx = {callbackParams.pidx || "-"}</p>
                <p>Debug: status = {callbackParams.status || "-"}</p>
                <p>Debug: transaction_id = {callbackParams.transactionId || "-"}</p>
              </div>
            )}
          </div>

          <aside className="travel-summary payment-summary">
            <div className="payment-summary__head">
              <div>
                <h2 className="text-lg font-semibold">Booking summary</h2>
                <p className="text-sm text-slate-600">Review details before paying.</p>
              </div>
              <span className={resolvePaymentBadge(paymentStatus)}>{paymentStatus}</span>
            </div>

            {bookingLoading ? (
              <p className="mt-3 text-sm text-slate-600">Loading booking...</p>
            ) : booking ? (
              <div className="mt-3 grid gap-2 text-sm">
                <div className="payment-summary__row">
                  <span>Package</span>
                  <strong>{booking?.tripPackageId?.title || "-"}</strong>
                </div>
                <div className="payment-summary__row">
                  <span>Place</span>
                  <strong>{booking?.listingId?.title || booking?.locationId?.name || "-"}</strong>
                </div>
                <div className="payment-summary__row">
                  <span>Guests</span>
                  <strong>{booking.guests || 1}</strong>
                </div>
                <div className="payment-summary__row">
                  <span>Check-in</span>
                  <strong>{formatDate(booking.checkIn || booking.date)}</strong>
                </div>
                <div className="payment-summary__row">
                  <span>Check-out</span>
                  <strong>{formatDate(booking.checkOut || booking.date)}</strong>
                </div>
                <div className="payment-summary__total">
                  <span>Total</span>
                  <strong>NPR {booking.amount}</strong>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Booking not loaded.</p>
            )}
            {bookingError && <p className="travel-alert travel-alert-error">{bookingError}</p>}

            <div className="payment-support">
              <p>Need help with a payment?</p>
              <Link to="/bookings" className="payment-support__link">
                Go to booking history
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
