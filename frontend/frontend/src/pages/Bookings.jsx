import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/bookings/me");
      setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load booking history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const cancelBooking = async (id) => {
    try {
      await api.put(`/api/bookings/${id}/cancel`);
      setMessage("Booking cancelled successfully.");
      await loadBookings();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel booking");
    }
  };

  return (
    <div className="travel-shell">
      <div className="travel-container" style={{ maxWidth: 1100 }}>
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">My Bookings</p>
            <h1 className="text-3xl font-bold">Booking history and payment status</h1>
          </div>
          <Link to="/destination-search" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            New Booking
          </Link>
        </header>

        {message && <p className="travel-alert travel-alert-success">{message}</p>}
        {error && <p className="travel-alert travel-alert-error">{error}</p>}
        {loading && <p>Loading bookings...</p>}

        {!loading && bookings.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">
            No bookings found. Start with a destination search and reserve your stay.
          </div>
        )}

        <div className="travel-grid-2">
          {bookings.map((booking) => {
            const placeName =
              booking.tripPackageId?.title ||
              booking.listingId?.title ||
              booking.locationId?.name ||
              "Unknown place";
            const canCancel = booking.bookingStatus !== "cancelled" && booking.paymentStatus !== "paid";
            const addOns = Array.isArray(booking.addOnListingIds) ? booking.addOnListingIds : [];

            return (
              <article key={booking._id} className="travel-card" style={{ padding: "14px" }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{placeName}</h2>
                    <p className="text-sm text-slate-600">
                      {formatDate(booking.checkIn || booking.date)} - {formatDate(booking.checkOut || booking.date)}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Guests: {booking.guests || 1} | Total: NPR {booking.amount}
                    </p>
                    {addOns.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Add-ons: {addOns.map((item) => item.title || "Add-on").join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{booking.bookingStatus}</span>
                    <span className="rounded-full bg-teal-100 px-2 py-1 text-teal-700">{booking.paymentStatus}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => cancelBooking(booking._id)}
                    disabled={!canCancel}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </article>
            );
          })}
        </div>
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
