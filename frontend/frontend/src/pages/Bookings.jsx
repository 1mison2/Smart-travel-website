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
        <header className="bookings-hero">
          <div>
            <p className="bookings-kicker">Your Bookings</p>
            <h1>Booking history & payment status</h1>
            <p>Track your stays and activities, review payment states, and manage changes.</p>
          </div>
          <div className="bookings-hero__actions">
            <Link to="/destination-search" className="bookings-btn bookings-btn--primary">
              New Booking
            </Link>
            <Link to="/plan-trip" className="bookings-btn bookings-btn--ghost">
              Plan Trip
            </Link>
          </div>
        </header>

        <section className="bookings-metrics">
          <article>
            <strong>{counts.all}</strong>
            <span>Total bookings</span>
          </article>
          <article>
            <strong>{counts.confirmed}</strong>
            <span>Confirmed</span>
          </article>
          <article>
            <strong>{counts.paid}</strong>
            <span>Paid</span>
          </article>
          <article>
            <strong>{counts.pending}</strong>
            <span>Payment pending</span>
          </article>
          <article>
            <strong>{counts.cancelled}</strong>
            <span>Cancelled</span>
          </article>
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
          <div className="bookings-empty">
            No bookings found. Start with a destination search and reserve your stay.
          </div>
        )}

        <div className="bookings-grid">
          {filteredBookings.map((booking) => {
            const placeName =
              booking.tripPackageId?.title ||
              booking.listingId?.title ||
              booking.locationId?.name ||
              "Unknown place";
            const canCancel = booking.bookingStatus !== "cancelled" && booking.paymentStatus !== "paid";
            const addOns = Array.isArray(booking.addOnListingIds) ? booking.addOnListingIds : [];
            const statusLabel = String(booking.bookingStatus || "pending").replaceAll("_", " ");
            const paymentLabel = String(booking.paymentStatus || "pending").replaceAll("_", " ");

            return (
              <article key={booking._id} className="bookings-card">
                <div className="bookings-card__head">
                  <div>
                    <h2>{placeName}</h2>
                    <p>
                      {formatDate(booking.checkIn || booking.date)} - {formatDate(booking.checkOut || booking.date)}
                    </p>
                  </div>
                  <div className="bookings-card__badges">
                    <span className={`badge badge--status badge--${booking.bookingStatus || "pending"}`}>
                      {statusLabel}
                    </span>
                    <span className={`badge badge--pay badge--${booking.paymentStatus || "pending"}`}>
                      {paymentLabel}
                    </span>
                  </div>
                </div>

                <div className="bookings-card__meta">
                  <div>
                    <span>Guests</span>
                    <strong>{booking.guests || 1}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>NPR {booking.amount}</strong>
                  </div>
                  <div>
                    <span>Type</span>
                    <strong>{booking.bookingType || "listing"}</strong>
                  </div>
                </div>

                {addOns.length > 0 && (
                  <p className="bookings-card__addons">
                    Add-ons: {addOns.map((item) => item.title || "Add-on").join(", ")}
                  </p>
                )}

                <div className="bookings-card__actions">
                  <button
                    onClick={() => cancelBooking(booking._id)}
                    disabled={!canCancel}
                    className="bookings-btn bookings-btn--ghost"
                  >
                    Cancel
                  </button>
                  <Link to="/bookings" className="bookings-btn bookings-btn--primary">
                    View details
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style>{`
        .bookings-page {
          background: linear-gradient(140deg, rgba(14, 116, 144, 0.08), rgba(15, 23, 42, 0.06));
        }

        .bookings-hero {
          background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.25), transparent 60%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 64, 175, 0.92));
          border-radius: 28px;
          color: #e2e8f0;
          padding: 28px;
          display: flex;
          gap: 18px;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
          margin-bottom: 18px;
          font-family: "Space Grotesk", "Sora", "Manrope", system-ui, sans-serif;
        }

        .bookings-hero h1 {
          margin: 6px 0 8px;
          font-size: clamp(1.8rem, 3vw, 2.7rem);
        }

        .bookings-hero p {
          margin: 0;
          color: rgba(226, 232, 240, 0.78);
          max-width: 540px;
        }

        .bookings-kicker {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.28em;
          font-size: 0.7rem;
          color: rgba(226, 232, 240, 0.7);
        }

        .bookings-hero__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .bookings-btn {
          border-radius: 999px;
          padding: 10px 16px;
          font-weight: 600;
          font-size: 0.88rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
        }

        .bookings-btn--primary {
          background: linear-gradient(135deg, #38bdf8, #14b8a6);
          color: #0f172a;
        }

        .bookings-btn--ghost {
          background: rgba(15, 23, 42, 0.08);
          color: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .bookings-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .bookings-metrics article {
          background: #fff;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 16px;
          padding: 12px 14px;
          display: grid;
          gap: 4px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        }

        .bookings-metrics strong {
          font-size: 1.2rem;
          color: #0f172a;
        }

        .bookings-metrics span {
          font-size: 0.82rem;
          color: #64748b;
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

        .bookings-empty {
          border-radius: 18px;
          border: 1px dashed rgba(148, 163, 184, 0.6);
          background: #fff;
          padding: 18px;
          color: #64748b;
          margin-bottom: 18px;
        }

        .bookings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }

        .bookings-card {
          background: #fff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 22px;
          padding: 16px;
          display: grid;
          gap: 14px;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        }

        .bookings-card__head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .bookings-card__head h2 {
          margin: 0 0 4px;
          font-size: 1.1rem;
          color: #0f172a;
        }

        .bookings-card__head p {
          margin: 0;
          color: #64748b;
          font-size: 0.85rem;
        }

        .bookings-card__badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .badge {
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: capitalize;
        }

        .badge--status {
          background: rgba(15, 23, 42, 0.08);
          color: #0f172a;
        }

        .badge--confirmed {
          background: rgba(16, 185, 129, 0.15);
          color: #047857;
        }

        .badge--cancelled {
          background: rgba(239, 68, 68, 0.15);
          color: #b91c1c;
        }

        .badge--awaiting_payment {
          background: rgba(234, 179, 8, 0.18);
          color: #b45309;
        }

        .badge--pay {
          background: rgba(14, 116, 144, 0.12);
          color: #0e7490;
        }

        .badge--paid {
          background: rgba(59, 130, 246, 0.14);
          color: #1d4ed8;
        }

        .badge--failed {
          background: rgba(239, 68, 68, 0.15);
          color: #b91c1c;
        }

        .bookings-card__meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 10px;
          border-radius: 16px;
          background: rgba(148, 163, 184, 0.12);
        }

        .bookings-card__meta span {
          display: block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: #64748b;
        }

        .bookings-card__meta strong {
          font-size: 0.95rem;
          color: #0f172a;
        }

        .bookings-card__addons {
          margin: 0;
          color: #64748b;
          font-size: 0.82rem;
        }

        .bookings-card__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 720px) {
          .bookings-hero {
            flex-direction: column;
            align-items: flex-start;
          }

          .bookings-card__meta {
            grid-template-columns: 1fr;
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
