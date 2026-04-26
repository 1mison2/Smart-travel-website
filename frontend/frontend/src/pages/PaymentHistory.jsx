import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const getStats = (payments) =>
  payments.reduce(
    (acc, payment) => {
      acc.total += 1;
      if (payment.status === "success") acc.success += 1;
      else if (payment.status === "failed" || payment.status === "refunded") acc.failed += 1;
      else acc.pending += 1;
      return acc;
    },
    { total: 0, success: 0, failed: 0, pending: 0 }
  );

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/payments/me");
        setPayments(Array.isArray(data?.payments) ? data.payments : []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load payment history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => getStats(payments), [payments]);

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const bookingName = getPaymentBookingName(payment).toLowerCase();
      const status = String(payment.status || "").toLowerCase();
      const gatewayRef = String(payment.gatewayRef || "").toLowerCase();

      const matchesSearch = !keyword || [bookingName, status, gatewayRef].join(" ").includes(keyword);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesDate = isWithinDateRange(payment.createdAt, startDateFilter, endDateFilter);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [payments, search, statusFilter, startDateFilter, endDateFilter]);

  return (
    <div className="travel-shell payment-history-shell">
      <div className="travel-container" style={{ maxWidth: 1120 }}>
        <header className="travel-hero payment-history-hero">
          <div>
            <p className="travel-kicker">Payments</p>
            <h1 className="travel-title" style={{ fontSize: "2.1rem", marginTop: "8px" }}>
              Your payment history
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Review payment attempts, successful transactions, and booking confirmation dates.
            </p>
          </div>
          <div className="payment-history-actions">
            <Link to="/bookings" className="travel-btn travel-btn-soft">
              Manage bookings
            </Link>
          </div>
        </header>

        {error && <p className="travel-alert travel-alert-error">{error}</p>}
        {loading && <p className="text-sm text-slate-600">Loading payments...</p>}

        {!loading && payments.length > 0 && (
          <>
            <div className="payment-stats">
              <div className="payment-stat">
                <p>Total payments</p>
                <strong>{stats.total}</strong>
              </div>
              <div className="payment-stat payment-stat--success">
                <p>Successful</p>
                <strong>{stats.success}</strong>
              </div>
              <div className="payment-stat payment-stat--pending">
                <p>Pending</p>
                <strong>{stats.pending}</strong>
              </div>
              <div className="payment-stat payment-stat--failed">
                <p>Failed or refunded</p>
                <strong>{stats.failed}</strong>
              </div>
            </div>

            <div className="payment-toolbar">
              <input
                type="search"
                className="payment-toolbar__input"
                placeholder="Search booking or gateway reference"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="payment-toolbar__select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="success">Success</option>
                <option value="initiated">Initiated</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <input
                type="date"
                className="payment-toolbar__input"
                value={startDateFilter}
                onChange={(event) => setStartDateFilter(event.target.value)}
              />
              <input
                type="date"
                className="payment-toolbar__input"
                value={endDateFilter}
                min={startDateFilter || undefined}
                onChange={(event) => setEndDateFilter(event.target.value)}
              />
            </div>
          </>
        )}

        {!loading && payments.length === 0 && (
          <div className="travel-card payment-empty" style={{ marginTop: "16px" }}>
            <p className="text-sm text-slate-600">No payments yet. Book a package to see payments here.</p>
            <Link to="/trip-packages" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline">
              Browse trip packages
            </Link>
          </div>
        )}

        {!loading && payments.length > 0 && filteredPayments.length === 0 && (
          <div className="travel-card payment-empty" style={{ marginTop: "16px" }}>
            <p className="text-sm text-slate-600">No payments match your current filters.</p>
          </div>
        )}

        {!loading && filteredPayments.length > 0 && (
          <div className="travel-card payment-table" style={{ marginTop: "16px" }}>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Booking</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Gateway Ref</th>
                  <th>History</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{formatLabel(payment.provider)}</td>
                    <td>
                      <div className="payment-booking">
                        <strong>{getPaymentBookingName(payment)}</strong>
                        <small>{formatLabel(payment.bookingId?.bookingStatus || "pending")} booking</small>
                      </div>
                    </td>
                    <td>{`${payment.currency || "NPR"} ${Number(payment.amount || 0).toLocaleString()}`}</td>
                    <td>
                      <span
                        className={`payment-badge ${
                          payment.status === "success"
                            ? "payment-badge--success"
                            : payment.status === "failed" || payment.status === "refunded"
                            ? "payment-badge--danger"
                            : "payment-badge--warning"
                        }`}
                      >
                        {formatLabel(payment.status)}
                      </span>
                    </td>
                    <td>{payment.gatewayRef || "-"}</td>
                    <td>
                      <div className="payment-history-stack">
                        <span>Started: {formatDateTime(payment.createdAt)}</span>
                        {payment.verifiedAt && <span>Verified: {formatDateTime(payment.verifiedAt)}</span>}
                        {payment.bookingId?.paidAt && <span>Booked paid: {formatDateTime(payment.bookingId.paidAt)}</span>}
                        {payment.refundedAt && <span>Refunded: {formatDateTime(payment.refundedAt)}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .payment-toolbar {
          display: grid;
          grid-template-columns: minmax(240px, 1fr) repeat(3, minmax(180px, 0.4fr));
          gap: 12px;
          margin-top: 16px;
        }

        .payment-toolbar__input,
        .payment-toolbar__select {
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(255, 255, 255, 0.9);
          padding: 0 14px;
          color: #334155;
        }

        .payment-booking,
        .payment-history-stack {
          display: grid;
          gap: 4px;
        }

        .payment-booking strong {
          color: #0f172a;
        }

        .payment-booking small,
        .payment-history-stack span {
          color: #64748b;
          font-size: 0.8rem;
        }

        @media (max-width: 780px) {
          .payment-toolbar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function getPaymentBookingName(payment) {
  const booking = payment.bookingId || {};
  return booking.tripPackageId?.title || booking.listingId?.title || booking.locationId?.name || booking._id || "Booking";
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

function isWithinDateRange(value, filterStart, filterEnd) {
  if (!filterStart && !filterEnd) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (filterStart) {
    const start = new Date(filterStart);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }

  if (filterEnd) {
    const end = new Date(filterEnd);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }

  return true;
}
