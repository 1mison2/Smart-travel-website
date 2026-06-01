import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import api from "../utils/api";

const statusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["confirmed", "paid", "approved"].includes(normalized)) return "booking-detail-badge--success";
  if (["cancelled", "failed", "rejected"].includes(normalized)) return "booking-detail-badge--danger";
  if (["refunded"].includes(normalized)) return "booking-detail-badge--info";
  return "booking-detail-badge--warning";
};

const getBookingName = (booking) =>
  booking?.tripPackageId?.title ||
  booking?.packageSnapshot?.title ||
  booking?.listingId?.title ||
  booking?.locationId?.name ||
  "Travel booking";

const getBookingPlace = (booking) =>
  [
    booking?.packageSnapshot?.location,
    booking?.listingId?.location?.name,
    booking?.listingId?.location?.district,
    booking?.locationId?.district,
    booking?.locationId?.province,
  ]
    .filter(Boolean)
    .join(", ") || "Nepal";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatMoney = (value, currency = "NPR") => `${currency} ${Number(value || 0).toLocaleString()}`;

const formatLabel = (value) =>
  String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getBookingEndDate = (booking) =>
  booking?.checkOut || booking?.packageSnapshot?.endDate || booking?.checkIn || booking?.date || "";

const hasBookingEnded = (booking) => {
  const endDate = new Date(getBookingEndDate(booking));
  if (Number.isNaN(endDate.getTime())) return false;
  endDate.setHours(23, 59, 59, 999);
  return endDate < new Date();
};

const buildTimeline = (booking) => [
  {
    label: "Booking created",
    date: booking?.createdAt,
    complete: Boolean(booking?.createdAt),
    icon: FileText,
  },
  {
    label: booking?.paymentStatus === "paid" ? "Payment completed" : "Payment pending",
    date: booking?.paidAt,
    complete: booking?.paymentStatus === "paid",
    icon: CreditCard,
  },
  {
    label: booking?.bookingStatus === "cancelled" ? "Booking cancelled" : "Booking confirmed",
    date: booking?.cancelledAt || booking?.paidAt,
    complete: booking?.bookingStatus === "cancelled" || booking?.bookingStatus === "confirmed",
    danger: booking?.bookingStatus === "cancelled",
    icon: booking?.bookingStatus === "cancelled" ? XCircle : CheckCircle2,
  },
  {
    label:
      booking?.refundRequestStatus === "requested"
        ? "Refund under review"
        : booking?.paymentStatus === "refunded"
        ? "Refund completed"
        : "Refund status",
    date: booking?.refundedAt || booking?.refundRequestedAt,
    complete: booking?.refundRequestStatus !== "none" || booking?.paymentStatus === "refunded",
    icon: RefreshCcw,
  },
];

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/bookings/${id}`);
      setBooking(data?.booking || null);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const pricingRows = useMemo(() => {
    const pricing = booking?.pricingSnapshot || {};
    return [
      ["Base price", pricing.basePrice || pricing.unitPrice],
      ["Add-ons", pricing.addOnTotal],
      ["Subtotal", pricing.subtotal],
      ["Service fee", pricing.serviceFee],
      ["Tax", pricing.tax],
    ].filter(([, value]) => Number(value || 0) > 0);
  }, [booking]);

  const isPastTrip = booking ? hasBookingEnded(booking) : false;
  const canPay = booking && !isPastTrip && booking.paymentStatus !== "paid" && booking.bookingStatus !== "cancelled";
  const canCancel = booking && !isPastTrip && booking.bookingStatus !== "cancelled" && booking.paymentStatus !== "paid";
  const canRequestRefund =
    booking &&
    !isPastTrip &&
    booking.paymentStatus === "paid" &&
    booking.refundRequestStatus !== "requested" &&
    booking.refundRequestStatus !== "approved";

  const cancelBooking = async () => {
    if (!booking) return;
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      await api.put(`/api/bookings/${booking._id}/cancel`);
      setMessage("Booking cancelled successfully.");
      await loadBooking();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setSubmitting(false);
    }
  };

  const requestRefund = async () => {
    if (!booking) return;
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      await api.put(`/api/bookings/${booking._id}/refund-request`, {
        reason: refundReason.trim(),
      });
      setRefundReason("");
      setMessage("Refund request submitted for admin review.");
      await loadBooking();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit refund request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="travel-shell">
        <div className="travel-container">Loading booking details...</div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="travel-shell">
        <div className="travel-container">
          <p className="travel-alert travel-alert-error">{error}</p>
          <button type="button" className="travel-btn travel-btn-soft" onClick={() => navigate("/bookings")}>
            Back to bookings
          </button>
        </div>
      </div>
    );
  }

  const timeline = buildTimeline(booking);

  return (
    <div className="travel-shell booking-detail-page">
      <div className="travel-container" style={{ maxWidth: 1180 }}>
        <button type="button" className="booking-detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </button>

        <header className="booking-detail-hero">
          <div>
            <p className="travel-kicker">Booking Details</p>
            <h1>{getBookingName(booking)}</h1>
            <p>
              <MapPin size={16} />
              {getBookingPlace(booking)}
            </p>
          </div>
          <div className="booking-detail-hero__badges">
            <span className={`booking-detail-badge ${statusTone(booking.bookingStatus)}`}>
              {formatLabel(booking.bookingStatus || "pending")}
            </span>
            <span className={`booking-detail-badge ${statusTone(booking.paymentStatus)}`}>
              {formatLabel(booking.paymentStatus || "pending")}
            </span>
          </div>
        </header>

        {message ? <p className="travel-alert travel-alert-success">{message}</p> : null}
        {error ? <p className="travel-alert travel-alert-error">{error}</p> : null}

        <section className="booking-detail-grid">
          <article className="booking-detail-card booking-detail-card--main">
            <div className="booking-detail-section-head">
              <div>
                <p className="travel-kicker">Timeline</p>
                <h2>Reservation progress</h2>
              </div>
              <ShieldCheck size={22} />
            </div>

            <div className="booking-detail-timeline">
              {timeline.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`booking-detail-step ${item.complete ? "is-complete" : ""} ${
                      item.danger ? "is-danger" : ""
                    }`}
                  >
                    <span className="booking-detail-step__icon">
                      <Icon size={17} />
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.date ? formatDateTime(item.date) : "Not completed yet"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="booking-detail-facts">
              <div>
                <CalendarDays size={18} />
                <span>Dates</span>
                <strong>
                  {formatDate(booking.checkIn || booking.date)} - {formatDate(booking.checkOut || booking.date)}
                </strong>
              </div>
              <div>
                <Users size={18} />
                <span>Guests</span>
                <strong>{booking.guests || 1}</strong>
              </div>
              <div>
                <CreditCard size={18} />
                <span>Total</span>
                <strong>{formatMoney(booking.amount, booking.currency)}</strong>
              </div>
            </div>

            {booking.notes ? (
              <div className="booking-detail-note">
                <span>Special request</span>
                <p>{booking.notes}</p>
              </div>
            ) : null}
          </article>

          <aside className="booking-detail-card">
            <div className="booking-detail-section-head">
              <div>
                <p className="travel-kicker">Actions</p>
                <h2>Next steps</h2>
              </div>
            </div>

            <div className="booking-detail-actions">
              {canPay ? (
                <Link to={`/payment?bookingId=${booking._id}`} className="travel-btn travel-btn-primary">
                  Pay with Khalti
                </Link>
              ) : null}
              <Link to="/payments" className="travel-btn travel-btn-soft">
                Payment history
              </Link>
              {canCancel ? (
                <button type="button" className="travel-btn travel-btn-soft" onClick={cancelBooking} disabled={submitting}>
                  {submitting ? "Cancelling..." : "Cancel booking"}
                </button>
              ) : null}
            </div>

            <div className="booking-detail-refund">
              <span className={`booking-detail-badge ${statusTone(booking.refundRequestStatus)}`}>
                Refund {formatLabel(booking.refundRequestStatus || "none")}
              </span>
              {isPastTrip ? <p>This trip has already ended, so cancellation and refund requests are closed.</p> : null}
              {booking.refundReason ? <p>Reason: {booking.refundReason}</p> : null}
              {booking.refundDecisionNote ? <p>Admin note: {booking.refundDecisionNote}</p> : null}
              {canRequestRefund ? (
                <div className="booking-detail-refund__form">
                  <textarea
                    rows={4}
                    value={refundReason}
                    onChange={(event) => setRefundReason(event.target.value)}
                    placeholder="Optional refund reason"
                  />
                  <button type="button" className="travel-btn travel-btn-primary" onClick={requestRefund} disabled={submitting}>
                    {submitting ? "Submitting..." : "Request refund"}
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </section>

        <section className="booking-detail-grid booking-detail-grid--lower">
          <article className="booking-detail-card">
            <div className="booking-detail-section-head">
              <div>
                <p className="travel-kicker">Price</p>
                <h2>Cost breakdown</h2>
              </div>
            </div>
            <div className="booking-detail-price-list">
              {pricingRows.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{formatMoney(value, booking.currency)}</strong>
                </div>
              ))}
              <div className="booking-detail-price-list__total">
                <span>Total paid/owed</span>
                <strong>{formatMoney(booking.amount, booking.currency)}</strong>
              </div>
            </div>
          </article>

          <article className="booking-detail-card">
            <div className="booking-detail-section-head">
              <div>
                <p className="travel-kicker">Reference</p>
                <h2>Booking record</h2>
              </div>
            </div>
            <div className="booking-detail-record">
              <div>
                <span>Booking ID</span>
                <strong>{booking._id}</strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{formatLabel(booking.bookingType || "booking")}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{formatDateTime(booking.createdAt)}</strong>
              </div>
              {booking.transactionId ? (
                <div>
                  <span>Transaction</span>
                  <strong>{booking.transactionId}</strong>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      </div>

      <style>{`
        .booking-detail-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          color: #475569;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          margin-bottom: 14px;
        }

        .booking-detail-hero,
        .booking-detail-card {
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 22px 46px rgba(15, 23, 42, 0.07);
        }

        .booking-detail-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
          border-radius: 30px;
          padding: 26px;
          margin-bottom: 18px;
        }

        .booking-detail-hero h1 {
          margin: 8px 0 10px;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.05;
          color: #0f172a;
        }

        .booking-detail-hero p:not(.travel-kicker) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #64748b;
          font-weight: 700;
        }

        .booking-detail-hero__badges,
        .booking-detail-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .booking-detail-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .booking-detail-badge--success { background: #dcfce7; color: #166534; }
        .booking-detail-badge--danger { background: #ffe4e6; color: #be123c; }
        .booking-detail-badge--warning { background: #fef3c7; color: #92400e; }
        .booking-detail-badge--info { background: #e0f2fe; color: #0369a1; }

        .booking-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(310px, 0.65fr);
          gap: 18px;
          align-items: start;
        }

        .booking-detail-grid--lower {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 18px;
        }

        .booking-detail-card {
          border-radius: 26px;
          padding: 22px;
        }

        .booking-detail-section-head {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 12px;
          color: #0f172a;
          margin-bottom: 18px;
        }

        .booking-detail-section-head h2 {
          margin: 5px 0 0;
          font-size: 1.35rem;
        }

        .booking-detail-timeline {
          display: grid;
          gap: 12px;
        }

        .booking-detail-step {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          align-items: start;
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          color: #64748b;
        }

        .booking-detail-step__icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #e2e8f0;
          color: #64748b;
        }

        .booking-detail-step.is-complete .booking-detail-step__icon {
          background: #dcfce7;
          color: #16a34a;
        }

        .booking-detail-step.is-danger .booking-detail-step__icon {
          background: #ffe4e6;
          color: #e11d48;
        }

        .booking-detail-step strong,
        .booking-detail-step span {
          display: block;
        }

        .booking-detail-step strong {
          color: #0f172a;
        }

        .booking-detail-step span {
          margin-top: 3px;
          font-size: 0.86rem;
        }

        .booking-detail-facts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .booking-detail-facts div,
        .booking-detail-note,
        .booking-detail-price-list div,
        .booking-detail-record div {
          border-radius: 18px;
          background: #f8fafc;
          padding: 14px;
        }

        .booking-detail-facts div {
          display: grid;
          gap: 7px;
          color: #2563eb;
        }

        .booking-detail-facts span,
        .booking-detail-note span,
        .booking-detail-price-list span,
        .booking-detail-record span {
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .booking-detail-facts strong,
        .booking-detail-price-list strong,
        .booking-detail-record strong {
          color: #0f172a;
          overflow-wrap: anywhere;
        }

        .booking-detail-note {
          margin-top: 14px;
        }

        .booking-detail-note p,
        .booking-detail-refund p {
          margin: 8px 0 0;
          color: #475569;
          line-height: 1.6;
        }

        .booking-detail-actions {
          display: grid;
          grid-template-columns: 1fr;
        }

        .booking-detail-refund {
          display: grid;
          gap: 12px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(226, 232, 240, 0.9);
        }

        .booking-detail-refund__form {
          display: grid;
          gap: 10px;
        }

        .booking-detail-refund textarea {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          padding: 12px 14px;
          color: #334155;
          font: inherit;
          resize: vertical;
        }

        .booking-detail-price-list,
        .booking-detail-record {
          display: grid;
          gap: 10px;
        }

        .booking-detail-price-list div,
        .booking-detail-record div {
          display: flex;
          justify-content: space-between;
          gap: 14px;
        }

        .booking-detail-price-list__total {
          background: #0f172a !important;
        }

        .booking-detail-price-list__total span,
        .booking-detail-price-list__total strong {
          color: #fff;
        }

        @media (max-width: 860px) {
          .booking-detail-hero,
          .booking-detail-grid,
          .booking-detail-grid--lower {
            grid-template-columns: 1fr;
          }

          .booking-detail-hero {
            display: grid;
            align-items: start;
          }

          .booking-detail-facts {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
