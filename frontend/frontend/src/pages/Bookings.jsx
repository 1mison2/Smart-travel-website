import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [refundModalBooking, setRefundModalBooking] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

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

  const counts = useMemo(
    () =>
      bookings.reduce(
        (acc, booking) => {
          acc.all += 1;
          if (booking.bookingStatus === "confirmed") acc.confirmed += 1;
          if (booking.bookingStatus === "cancelled") acc.cancelled += 1;
          if (booking.paymentStatus === "paid") acc.paid += 1;
          if (booking.paymentStatus === "pending") acc.pending += 1;
          return acc;
        },
        { all: 0, confirmed: 0, cancelled: 0, paid: 0, pending: 0 }
      ),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const placeName = getBookingName(booking).toLowerCase();
      const typeLabel = String(booking.bookingType || "listing").toLowerCase();
      const bookingStatus = String(booking.bookingStatus || "").toLowerCase();
      const paymentStatus = String(booking.paymentStatus || "").toLowerCase();
      const refundStatus = String(booking.refundRequestStatus || "").toLowerCase();

      const matchesSearch =
        !keyword ||
        [
          placeName,
          typeLabel,
          bookingStatus,
          paymentStatus,
          booking.locationId?.district,
          booking.locationId?.province,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        bookingStatus === statusFilter ||
        paymentStatus === statusFilter ||
        refundStatus === statusFilter;

      const matchesType = typeFilter === "all" || typeLabel === typeFilter;
      const matchesDate = isDateRangeMatch(
        booking.checkIn || booking.date,
        booking.checkOut || booking.date,
        startDateFilter,
        endDateFilter
      );

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [bookings, search, statusFilter, typeFilter, startDateFilter, endDateFilter]);

  const cancelBooking = async (id) => {
    try {
      setError("");
      setMessage("");
      await api.put(`/api/bookings/${id}/cancel`);
      setMessage("Booking cancelled successfully.");
      await loadBookings();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel booking");
    }
  };

  const requestRefund = async () => {
    if (!refundModalBooking) return;
    try {
      setError("");
      setMessage("");
      setIsSubmittingRefund(true);
      await api.put(`/api/bookings/${refundModalBooking._id}/refund-request`, {
        reason: refundReason.trim(),
      });
      setMessage("Refund request submitted successfully.");
      setRefundModalBooking(null);
      setRefundReason("");
      await loadBookings();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit refund request");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const typeOptions = Array.from(
    new Set(bookings.map((booking) => String(booking.bookingType || "").trim()).filter(Boolean))
  );

  return (
    <div className="travel-shell bookings-page">
      <div className="travel-container" style={{ maxWidth: 1200 }}>
        <header className="travel-hero payment-history-hero">
          <div>
            <p className="travel-kicker">Bookings</p>
            <h1 className="travel-title" style={{ fontSize: "2.1rem", marginTop: "8px" }}>
              Your booking history
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track when each reservation was created, paid, confirmed, or cancelled.
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

        <div className="bookings-toolbar">
          <input
            type="search"
            className="bookings-input"
            placeholder="Search place, status, or district"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="bookings-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="awaiting_payment">Awaiting payment</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="requested">Refund requested</option>
            <option value="rejected">Refund rejected</option>
          </select>
          <select className="bookings-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {formatLabel(type)}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="bookings-input"
            value={startDateFilter}
            onChange={(event) => setStartDateFilter(event.target.value)}
          />
          <input
            type="date"
            className="bookings-input"
            value={endDateFilter}
            min={startDateFilter || undefined}
            onChange={(event) => setEndDateFilter(event.target.value)}
          />
        </div>

        {message && <p className="travel-alert travel-alert-success">{message}</p>}
        {error && <p className="travel-alert travel-alert-error">{error}</p>}
        {loading && <p>Loading bookings...</p>}

        {!loading && filteredBookings.length === 0 && (
          <div className="travel-card payment-empty" style={{ marginTop: "16px" }}>
            <p className="text-sm text-slate-600">No bookings match your current filters.</p>
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
                  <th>History</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const canCancel =
                    booking.bookingStatus !== "cancelled" &&
                    booking.paymentStatus !== "paid" &&
                    booking.paymentStatus !== "refunded";
                  const canRequestRefund =
                    booking.paymentStatus === "paid" &&
                    booking.refundRequestStatus !== "requested" &&
                    booking.refundRequestStatus !== "approved";

                  return (
                    <tr key={booking._id}>
                      <td>
                        <div className="booking-place">
                          <strong>{getBookingName(booking)}</strong>
                          <small>{[booking.locationId?.district, booking.locationId?.province].filter(Boolean).join(", ") || "Travel booking"}</small>
                        </div>
                      </td>
                      <td>
                        {formatDate(booking.checkIn || booking.date)} - {formatDate(booking.checkOut || booking.date)}
                      </td>
                      <td>{booking.guests || 1}</td>
                      <td>NPR {Number(booking.amount || 0).toLocaleString()}</td>
                      <td>{formatLabel(booking.bookingType || "listing")}</td>
                      <td>
                        <span className={`payment-badge payment-badge--info`}>{formatLabel(booking.bookingStatus || "pending")}</span>
                      </td>
                      <td>
                        <span
                          className={`payment-badge ${
                            booking.paymentStatus === "paid"
                              ? "payment-badge--success"
                              : booking.paymentStatus === "failed" || booking.paymentStatus === "refunded"
                              ? "payment-badge--danger"
                              : "payment-badge--warning"
                          }`}
                        >
                          {formatLabel(booking.paymentStatus || "pending")}
                        </span>
                        {booking.refundRequestStatus !== "none" && (
                          <div style={{ marginTop: 8 }}>
                            <span className="payment-badge payment-badge--info">
                              {`Refund ${formatLabel(booking.refundRequestStatus)}`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="booking-history">
                          <span>Booked: {formatDateTime(booking.createdAt)}</span>
                          {booking.paidAt && <span>Paid: {formatDateTime(booking.paidAt)}</span>}
                          {booking.cancelledAt && <span>Cancelled: {formatDateTime(booking.cancelledAt)}</span>}
                          {booking.refundRequestedAt && <span>Refund requested: {formatDateTime(booking.refundRequestedAt)}</span>}
                          {booking.refundedAt && <span>Refunded: {formatDateTime(booking.refundedAt)}</span>}
                        </div>
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
                            <Link to={`/payment?bookingId=${booking._id}`} className="travel-btn travel-btn-primary">
                              Pay with Khalti
                            </Link>
                          )}
                          {canRequestRefund && (
                            <button
                              onClick={() => {
                                setRefundModalBooking(booking);
                                setRefundReason("");
                              }}
                              className="travel-btn travel-btn-soft"
                            >
                              Request refund
                            </button>
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

      {refundModalBooking && (
        <div className="refund-modal__backdrop" onClick={() => !isSubmittingRefund && setRefundModalBooking(null)}>
          <div className="refund-modal" onClick={(event) => event.stopPropagation()}>
            <div className="refund-modal__head">
              <div>
                <p className="travel-kicker">Refund request</p>
                <h2>Request a refund</h2>
              </div>
              <button
                type="button"
                className="refund-modal__close"
                onClick={() => !isSubmittingRefund && setRefundModalBooking(null)}
                disabled={isSubmittingRefund}
              >
                Close
              </button>
            </div>
            <p className="refund-modal__copy">
              Submit a refund request for <strong>{getBookingName(refundModalBooking)}</strong>. The admin team will review
              it before approval.
            </p>
            <label className="refund-modal__label" htmlFor="refund-reason">
              Reason
            </label>
            <textarea
              id="refund-reason"
              className="refund-modal__textarea"
              rows={5}
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              placeholder="Tell us why you want a refund"
              disabled={isSubmittingRefund}
            />
            <div className="refund-modal__actions">
              <button
                type="button"
                className="travel-btn travel-btn-soft"
                onClick={() => setRefundModalBooking(null)}
                disabled={isSubmittingRefund}
              >
                Cancel
              </button>
              <button
                type="button"
                className="travel-btn travel-btn-primary"
                onClick={requestRefund}
                disabled={isSubmittingRefund}
              >
                {isSubmittingRefund ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bookings-page {
          background: transparent;
        }

        .bookings-toolbar {
          display: grid;
          grid-template-columns: minmax(240px, 1.4fr) repeat(4, minmax(150px, 0.7fr));
          gap: 12px;
          margin: 14px 0 18px;
        }

        .bookings-input,
        .bookings-select {
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.9);
          padding: 0 14px;
          color: #334155;
        }

        .booking-table__actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .booking-place,
        .booking-history {
          display: grid;
          gap: 4px;
        }

        .booking-place strong {
          color: #0f172a;
        }

        .booking-place small,
        .booking-history span {
          color: #64748b;
          font-size: 0.8rem;
        }

        .refund-modal__backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.38);
          backdrop-filter: blur(6px);
        }

        .refund-modal {
          width: min(100%, 560px);
          border-radius: 28px;
          background: #fffaf5;
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
          padding: 24px;
        }

        .refund-modal__head,
        .refund-modal__actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .refund-modal__head h2 {
          margin: 6px 0 0;
          font-size: 1.6rem;
          color: #0f172a;
        }

        .refund-modal__copy {
          margin: 16px 0;
          color: #475569;
          line-height: 1.65;
        }

        .refund-modal__label {
          display: block;
          margin-bottom: 8px;
          font-weight: 700;
          color: #334155;
        }

        .refund-modal__textarea {
          width: 100%;
          resize: vertical;
          min-height: 120px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: #ffffff;
          padding: 14px 16px;
          color: #334155;
          font: inherit;
        }

        .refund-modal__close {
          border: 0;
          background: transparent;
          color: #64748b;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .bookings-toolbar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function getBookingName(booking) {
  return booking.tripPackageId?.title || booking.listingId?.title || booking.locationId?.name || "Unknown place";
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(value) {
  return String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isDateRangeMatch(rawStart, rawEnd, filterStart, filterEnd) {
  if (!filterStart && !filterEnd) return true;

  const start = new Date(rawStart || rawEnd || 0);
  const end = new Date(rawEnd || rawStart || 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  if (filterStart) {
    const selectedStart = new Date(filterStart);
    selectedStart.setHours(0, 0, 0, 0);
    if (end < selectedStart) return false;
  }

  if (filterEnd) {
    const selectedEnd = new Date(filterEnd);
    selectedEnd.setHours(23, 59, 59, 999);
    if (start > selectedEnd) return false;
  }

  return true;
}
