import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");

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

  const counts = bookings.reduce(
    (acc, booking) => {
      acc.all += 1;
      if (booking.bookingStatus === "confirmed") acc.confirmed += 1;
      if (booking.bookingStatus === "cancelled") acc.cancelled += 1;
      if (booking.paymentStatus === "paid") acc.paid += 1;
      if (booking.paymentStatus === "pending") acc.pending += 1;
      return acc;
    },
    { all: 0, confirmed: 0, cancelled: 0, paid: 0, pending: 0 }
  );

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    if (filter === "confirmed") return booking.bookingStatus === "confirmed";
    if (filter === "cancelled") return booking.bookingStatus === "cancelled";
    if (filter === "paid") return booking.paymentStatus === "paid";
    if (filter === "pending") return booking.paymentStatus === "pending";
    return true;
  });

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
    <div className="travel-shell bookings-page">
      <div className="travel-container" style={{ maxWidth: 1150 }}>
        <header className="travel-hero payment-history-hero">
          <div>
            <p className="travel-kicker">Bookings</p>
            <h1 className="travel-title" style={{ fontSize: "2.1rem", marginTop: "8px" }}>
              Your booking history
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your stays and activities, review payment states, and manage changes.
            </p>
          </div>
          <div className="payment-history-actions">
            <Link to="/payments" className="travel-btn travel-btn-soft">
              Payment History
            </Link>
          </div>
        </header>

        <section className="payment-stats">
          <div className="payment-stat">
            <p>Total bookings</p>
            <strong>{counts.all}</strong>
          </div>
          <div className="payment-stat payment-stat--success">
            <p>Confirmed</p>
            <strong>{counts.confirmed}</strong>
          </div>
          <div className="payment-stat payment-stat--success">
            <p>Paid</p>
            <strong>{counts.paid}</strong>
          </div>
          <div className="payment-stat payment-stat--pending">
            <p>Payment pending</p>
            <strong>{counts.pending}</strong>
          </div>
          <div className="payment-stat payment-stat--failed">
            <p>Cancelled</p>
            <strong>{counts.cancelled}</strong>
          </div>
        </section>

        <div className="bookings-filter">
          <span>Filter</span>
          {[
            { id: "all", label: "All" },
            { id: "confirmed", label: "Confirmed" },
            { id: "paid", label: "Paid" },
            { id: "pending", label: "Payment pending" },
            { id: "cancelled", label: "Cancelled" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`bookings-chip ${filter === item.id ? "bookings-chip--active" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {message && <p className="travel-alert travel-alert-success">{message}</p>}
        {error && <p className="travel-alert travel-alert-error">{error}</p>}
        {loading && <p>Loading bookings...</p>}

        {!loading && filteredBookings.length === 0 && (
          <div className="travel-card payment-empty" style={{ marginTop: "16px" }}>
            <p className="text-sm text-slate-600">No bookings found yet.</p>
          </div>
        )}

        {!loading && filteredBookings.length > 0 && (
          <div className="travel-card payment-table" style={{ marginTop: "16px" }}>
            <table>
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Dates</th>
                  <th>Guests</th>
                  <th>Total</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const placeName =
                    booking.tripPackageId?.title ||
                    booking.listingId?.title ||
                    booking.locationId?.name ||
                    "Unknown place";
                  const canCancel = booking.bookingStatus !== "cancelled" && booking.paymentStatus !== "paid";
                  const statusLabel = String(booking.bookingStatus || "pending").replaceAll("_", " ");
                  const paymentLabel = String(booking.paymentStatus || "pending").replaceAll("_", " ");

                  return (
                    <tr key={booking._id}>
                      <td>{placeName}</td>
                      <td>
                        {formatDate(booking.checkIn || booking.date)} - {formatDate(booking.checkOut || booking.date)}
                      </td>
                      <td>{booking.guests || 1}</td>
                      <td>NPR {booking.amount}</td>
                      <td>{booking.bookingType || "listing"}</td>
                      <td>
                        <span className={`payment-badge payment-badge--info`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`payment-badge ${
                            booking.paymentStatus === "paid"
                              ? "payment-badge--success"
                              : booking.paymentStatus === "failed"
                              ? "payment-badge--danger"
                              : "payment-badge--warning"
                          }`}
                        >
                          {paymentLabel}
                        </span>
                      </td>
                      <td>
                        <div className="booking-table__actions">
                          <button
                            onClick={() => cancelBooking(booking._id)}
                            disabled={!canCancel}
                            className="travel-btn travel-btn-soft"
                          >
                            Cancel
                          </button>
                          {booking.paymentStatus !== "paid" && booking.bookingStatus !== "cancelled" && (
                            <Link
                              to={`/payment?bookingId=${booking._id}`}
                              className="travel-btn travel-btn-primary"
                            >
                              Pay with Khalti
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .bookings-page {
          background: linear-gradient(140deg, rgba(14, 116, 144, 0.08), rgba(15, 23, 42, 0.06));
        }

        .bookings-filter {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin: 12px 0 18px;
          color: #64748b;
          font-size: 0.85rem;
        }

        .bookings-chip {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          padding: 6px 12px;
          background: #fff;
          color: #0f172a;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .bookings-chip--active {
          background: #0f172a;
          color: #f8fafc;
          border-color: #0f172a;
        }

        .booking-table__actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 720px) {
          .bookings-filter {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
