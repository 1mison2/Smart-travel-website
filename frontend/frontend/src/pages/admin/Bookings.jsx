import React, { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [refundFilter, setRefundFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    booking: "all",
    payment: "all",
    refund: "all",
    startDate: "",
    endDate: "",
  });
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [refundReviewModal, setRefundReviewModal] = useState(null);
  const [refundReviewNote, setRefundReviewNote] = useState("");
  const [isSubmittingRefundReview, setIsSubmittingRefundReview] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/bookings");
      setBookings(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const keyword = appliedFilters.search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const haystack = [
        booking.userId?.name,
        booking.userId?.email,
        getBookingName(booking),
        booking.locationId?.district,
        booking.locationId?.province,
        booking.bookingType,
        booking.bookingStatus,
        booking.paymentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || haystack.includes(keyword);
      const matchesBooking = appliedFilters.booking === "all" || booking.bookingStatus === appliedFilters.booking;
      const matchesPayment = appliedFilters.payment === "all" || booking.paymentStatus === appliedFilters.payment;
      const matchesRefund = appliedFilters.refund === "all" || booking.refundRequestStatus === appliedFilters.refund;
      const matchesDate = isDateRangeMatch(
        booking.checkIn || booking.date,
        booking.checkOut || booking.date,
        appliedFilters.startDate,
        appliedFilters.endDate
      );
      return matchesSearch && matchesBooking && matchesPayment && matchesRefund && matchesDate;
    });
  }, [bookings, appliedFilters]);

  const onDelete = async (id) => {
    try {
      setError("");
      setMessage("");
      await api.delete(`/api/admin/bookings/${id}`);
      setBookings((prev) => prev.filter((item) => item._id !== id));
      setMessage("Booking deleted successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete booking");
    }
  };

  const onUpdateStatus = async (id, bookingStatus) => {
    try {
      setError("");
      setMessage("");
      const { data } = await api.put(`/api/admin/bookings/${id}/status`, { bookingStatus });
      setBookings((prev) => prev.map((item) => (item._id === id ? { ...item, ...data.booking } : item)));
      setMessage(data?.message || "Booking status updated.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update booking status");
    }
  };

  const onReviewRefund = async () => {
    if (!refundReviewModal?.booking || !refundReviewModal?.action) return;
    try {
      setError("");
      setMessage("");
      setIsSubmittingRefundReview(true);
      const { data } = await api.put(`/api/admin/bookings/${refundReviewModal.booking._id}/refund`, {
        action: refundReviewModal.action,
        note: refundReviewNote.trim(),
      });
      setBookings((prev) =>
        prev.map((item) => (item._id === refundReviewModal.booking._id ? { ...item, ...data.booking } : item))
      );
      setMessage(data?.message || "Refund request updated.");
      setRefundReviewModal(null);
      setRefundReviewNote("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to review refund request");
    } finally {
      setIsSubmittingRefundReview(false);
    }
  };

  const applyFilters = () => {
    setAppliedFilters({
      search,
      booking: bookingFilter,
      payment: paymentFilter,
      refund: refundFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    });
    setHasAppliedFilters(true);
  };

  const resetBrowseFilters = () => {
    setSearch("");
    setBookingFilter("all");
    setPaymentFilter("all");
    setRefundFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setAppliedFilters({
      search: "",
      booking: "all",
      payment: "all",
      refund: "all",
      startDate: "",
      endDate: "",
    });
    setHasAppliedFilters(false);
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Booking Management</h1>
      <p className="admin-page__subtitle">Review booking history, payment state, and safe admin actions.</p>
      {message && <p className="admin-alert admin-alert--success">{message}</p>}
      {error && <p className="admin-alert admin-alert--error">{error}</p>}

      <div className="admin-card admin-card--padded" style={{ marginBottom: 16 }}>
        <div className="admin-toolbar-grid">
          <input
            className="admin-input"
            type="search"
            placeholder="Search traveler, place, or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-input" value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value)}>
            <option value="all">All booking states</option>
            <option value="pending">Pending</option>
            <option value="awaiting_payment">Awaiting payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="admin-input" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="all">All payment states</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select className="admin-input" value={refundFilter} onChange={(event) => setRefundFilter(event.target.value)}>
            <option value="all">All refund states</option>
            <option value="none">No request</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            className="admin-input"
            type="date"
            value={startDateFilter}
            onChange={(event) => setStartDateFilter(event.target.value)}
          />
          <input
            className="admin-input"
            type="date"
            value={endDateFilter}
            min={startDateFilter || undefined}
            onChange={(event) => setEndDateFilter(event.target.value)}
          />
        </div>
        <div className="admin-filter-panel__actions" style={{ marginTop: 12 }}>
          <button type="button" className="admin-btn admin-btn--primary" onClick={applyFilters}>
            Apply filters
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--muted"
            onClick={resetBrowseFilters}
            disabled={!search && bookingFilter === "all" && paymentFilter === "all" && refundFilter === "all" && !startDateFilter && !endDateFilter}
          >
            Reset filters
          </button>
        </div>
      </div>

      {loading ? (
        <p className="admin-loading">Loading bookings...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          {!hasAppliedFilters ? (
            <p className="admin-empty">Apply filters to view booking details.</p>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Booking</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Booking</th>
                    <th>Payment</th>
                    <th>History</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const isPaid = booking.paymentStatus === "paid";
                    const canConfirm = !isPaid && booking.bookingStatus !== "confirmed" && booking.bookingStatus !== "cancelled";
                    const canCancel = !isPaid && booking.bookingStatus !== "cancelled";
                    const canDelete = !isPaid;
                    const canApproveRefund = booking.refundRequestStatus === "requested";

                    return (
                      <tr key={booking._id}>
                        <td>
                          <div className="admin-history-cell">
                            <strong>{booking.userId?.name || "Unknown"}</strong>
                            <small>{booking.userId?.email || "-"}</small>
                          </div>
                        </td>
                        <td>
                          <div className="admin-history-cell">
                            <strong>{getBookingName(booking)}</strong>
                            <small>{formatLabel(booking.bookingType || "listing")}</small>
                          </div>
                        </td>
                        <td>{formatDate(booking.date)}</td>
                        <td>{`${booking.currency || "NPR"} ${Number(booking.amount || 0).toLocaleString()}`}</td>
                        <td>
                          <span className={`admin-badge admin-badge--${resolveBookingTone(booking.bookingStatus)}`}>
                            {formatLabel(booking.bookingStatus)}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge admin-badge--${resolvePaymentTone(booking.paymentStatus)}`}>
                            {formatLabel(booking.paymentStatus)}
                          </span>
                          {booking.refundRequestStatus !== "none" && (
                            <div style={{ marginTop: 8 }}>
                              <span className={`admin-badge admin-badge--${resolveRefundTone(booking.refundRequestStatus)}`}>
                                {`Refund ${formatLabel(booking.refundRequestStatus)}`}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="admin-history-cell">
                            <small>Booked: {formatDateTime(booking.createdAt)}</small>
                            {booking.paidAt && <small>Paid: {formatDateTime(booking.paidAt)}</small>}
                            {booking.cancelledAt && <small>Cancelled: {formatDateTime(booking.cancelledAt)}</small>}
                            {booking.refundRequestedAt && <small>Refund requested: {formatDateTime(booking.refundRequestedAt)}</small>}
                            {booking.refundedAt && <small>Refunded: {formatDateTime(booking.refundedAt)}</small>}
                          </div>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(booking._id, "confirmed")}
                              className="admin-btn admin-btn--success"
                              disabled={!canConfirm}
                              title={isPaid ? "Paid bookings stay confirmed unless handled through a refund flow." : ""}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(booking._id, "cancelled")}
                              className="admin-btn admin-btn--warning"
                              disabled={!canCancel}
                              title={isPaid ? "Paid bookings cannot be cancelled from admin status actions." : ""}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(booking._id)}
                              className="admin-btn admin-btn--danger"
                              disabled={!canDelete}
                              title={isPaid ? "Paid bookings cannot be deleted." : ""}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRefundReviewModal({ booking, action: "approve" });
                                setRefundReviewNote("");
                              }}
                              className="admin-btn admin-btn--success"
                              disabled={!canApproveRefund}
                            >
                              Approve refund
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRefundReviewModal({ booking, action: "reject" });
                                setRefundReviewNote("");
                              }}
                              className="admin-btn admin-btn--warning"
                              disabled={!canApproveRefund}
                            >
                              Reject refund
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredBookings.length && <p className="admin-empty">No bookings match the applied filters.</p>}
            </>
          )}
        </div>
      )}

      {refundReviewModal && (
        <div
          className="admin-refund-modal__backdrop"
          onClick={() => !isSubmittingRefundReview && setRefundReviewModal(null)}
        >
          <div className="admin-refund-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-refund-modal__head">
              <div>
                <p className="admin-page__subtitle" style={{ margin: 0 }}>
                  Refund review
                </p>
                <h2 className="admin-page__title" style={{ margin: "6px 0 0", fontSize: "1.5rem" }}>
                  {refundReviewModal.action === "approve" ? "Approve refund" : "Reject refund"}
                </h2>
              </div>
              <button
                type="button"
                className="admin-refund-modal__close"
                onClick={() => !isSubmittingRefundReview && setRefundReviewModal(null)}
                disabled={isSubmittingRefundReview}
              >
                Close
              </button>
            </div>

            <p className="admin-refund-modal__copy">
              {refundReviewModal.action === "approve"
                ? `Approve the refund request for ${getBookingName(refundReviewModal.booking)}.`
                : `Reject the refund request for ${getBookingName(refundReviewModal.booking)}.`}
            </p>

            <label className="admin-refund-modal__label" htmlFor="admin-refund-note">
              {refundReviewModal.action === "approve" ? "Approval note" : "Rejection reason"}
            </label>
            <textarea
              id="admin-refund-note"
              className="admin-refund-modal__textarea"
              rows={5}
              value={refundReviewNote}
              onChange={(event) => setRefundReviewNote(event.target.value)}
              placeholder={
                refundReviewModal.action === "approve"
                  ? "Add an optional note for the traveler"
                  : "Explain why this refund request is being rejected"
              }
              disabled={isSubmittingRefundReview}
            />

            <div className="admin-refund-modal__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setRefundReviewModal(null)}
                disabled={isSubmittingRefundReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`admin-btn ${
                  refundReviewModal.action === "approve" ? "admin-btn--success" : "admin-btn--warning"
                }`}
                onClick={onReviewRefund}
                disabled={isSubmittingRefundReview}
              >
                {isSubmittingRefundReview
                  ? "Saving..."
                  : refundReviewModal.action === "approve"
                  ? "Approve refund"
                  : "Reject refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-toolbar-grid {
          display: grid;
          grid-template-columns: minmax(260px, 1.3fr) repeat(5, minmax(150px, 0.7fr));
          gap: 12px;
        }

        .admin-history-cell {
          display: grid;
          gap: 4px;
        }

        .admin-history-cell small {
          color: #64748b;
        }

        .admin-empty {
          padding: 18px;
          color: #64748b;
        }

        .admin-refund-modal__backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.38);
          backdrop-filter: blur(6px);
        }

        .admin-refund-modal {
          width: min(100%, 560px);
          border-radius: 24px;
          background: #ffffff;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
        }

        .admin-refund-modal__head,
        .admin-refund-modal__actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .admin-refund-modal__copy {
          margin: 16px 0;
          color: #475569;
          line-height: 1.6;
        }

        .admin-refund-modal__label {
          display: block;
          margin-bottom: 8px;
          font-weight: 700;
          color: #334155;
        }

        .admin-refund-modal__textarea {
          width: 100%;
          min-height: 120px;
          resize: vertical;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          padding: 14px 16px;
          color: #334155;
          font: inherit;
        }

        .admin-refund-modal__close {
          border: 0;
          background: transparent;
          color: #64748b;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 920px) {
          .admin-toolbar-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function getBookingName(booking) {
  return booking.tripPackageId?.title || booking.listingId?.title || booking.locationId?.name || "Unknown";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
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

function resolveBookingTone(status) {
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "danger";
  return "warning";
}

function resolvePaymentTone(status) {
  if (status === "paid") return "success";
  if (status === "failed" || status === "refunded") return "danger";
  return "warning";
}

function resolveRefundTone(status) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
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
