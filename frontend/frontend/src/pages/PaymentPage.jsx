import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../utils/api";

export default function PaymentPage() {
  const location = useLocation();
  const bookingId = useMemo(
    () => new URLSearchParams(location.search).get("bookingId") || "",
    [location.search]
  );

  const [provider, setProvider] = useState("khalti");
  const [booking, setBooking] = useState(null);
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

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

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const initiate = async () => {
    if (!bookingId) return;
    if (!booking) {
      setActionError("Load booking first before initiating payment.");
      return;
    }
    try {
      setLoading(true);
      setActionError("");
      setMessage("");
      const { data } = await api.post(`/api/bookings/${bookingId}/payments/initiate`, {
        paymentProvider: provider,
      });
      setPaymentMeta(data?.payment || null);
      setMessage(`Payment initiated with ${provider.toUpperCase()} sandbox.`);
      await fetchBooking();
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Failed to initiate payment";
      setActionError(status ? `${message} (HTTP ${status})` : message);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (success) => {
    if (!bookingId || !paymentMeta?.paymentId) return;
    try {
      setLoading(true);
      setActionError("");
      setMessage("");
      const { data } = await api.post(`/api/bookings/${bookingId}/payments/confirm`, {
        paymentId: paymentMeta.paymentId,
        success,
      });
      setMessage(data?.message || (success ? "Payment successful" : "Payment failed"));
      await fetchBooking();
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Failed to confirm payment";
      setActionError(status ? `${message} (HTTP ${status})` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="travel-shell">
      <div className="travel-container" style={{ maxWidth: 980 }}>
        <header className="travel-hero">
          <p className="travel-kicker">Secure Payment</p>
          <h1 className="travel-title" style={{ fontSize: "2rem", marginTop: "8px" }}>Complete your booking payment</h1>
          <p className="mt-1 text-sm text-slate-600">
            Booking ID: <span className="font-mono">{bookingId || "Missing"}</span>
          </p>
        </header>

        <section className="travel-grid-2" style={{ marginTop: "16px" }}>
          <div className="travel-card" style={{ padding: "18px" }}>
            <h2 className="text-lg font-semibold">Payment method</h2>
            <div className="mt-3 grid gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <input
                  type="radio"
                  checked={provider === "khalti"}
                  onChange={() => setProvider("khalti")}
                />
                <span>Khalti Sandbox</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <input
                  type="radio"
                  checked={provider === "esewa"}
                  onChange={() => setProvider("esewa")}
                />
                <span>eSewa Sandbox</span>
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={initiate}
                disabled={loading || bookingLoading || !bookingId || !booking || booking?.paymentStatus === "paid"}
                className="travel-btn travel-btn-primary"
              >
                Initiate payment
              </button>
              <button
                type="button"
                onClick={() => confirmPayment(true)}
                disabled={loading || !paymentMeta?.paymentId || booking?.paymentStatus === "paid"}
                className="travel-btn"
                style={{ background: "#047857", color: "#fff" }}
              >
                Simulate success
              </button>
              <button
                type="button"
                onClick={() => confirmPayment(false)}
                disabled={loading || !paymentMeta?.paymentId || booking?.paymentStatus === "paid"}
                className="travel-btn"
                style={{ background: "#d97706", color: "#fff" }}
              >
                Simulate failure
              </button>
            </div>

            {message && <p className="travel-alert travel-alert-success">{message}</p>}
            {actionError && <p className="travel-alert travel-alert-error">{actionError}</p>}
          </div>

          <aside className="travel-summary">
            <h2 className="text-lg font-semibold">Booking summary</h2>
            {bookingLoading ? (
              <p className="mt-3 text-sm text-slate-600">Loading booking...</p>
            ) : booking ? (
              <div className="mt-3 grid gap-1 text-sm">
                <p>
                  Place: <strong>{booking?.listingId?.title || booking?.locationId?.name || "-"}</strong>
                </p>
                <p>
                  Guests: <strong>{booking.guests || 1}</strong>
                </p>
                <p>
                  Check-in: <strong>{formatDate(booking.checkIn || booking.date)}</strong>
                </p>
                <p>
                  Check-out: <strong>{formatDate(booking.checkOut || booking.date)}</strong>
                </p>
                <p>
                  Total: <strong>NPR {booking.amount}</strong>
                </p>
                <p>
                  Booking status: <strong>{booking.bookingStatus}</strong>
                </p>
                <p>
                  Payment status: <strong>{booking.paymentStatus}</strong>
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Booking not loaded.</p>
            )}
            {bookingError && <p className="travel-alert travel-alert-error">{bookingError}</p>}

            <Link to="/bookings" className="mt-5 inline-block text-sm font-semibold text-teal-700 hover:underline">
              Go to booking history
            </Link>
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
