import React, { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    status: "all",
    startDate: "",
    endDate: "",
  });
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/payments/me");
        setPayments(Array.isArray(data?.payments) ? data.payments : []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredPayments = useMemo(() => {
    const keyword = appliedFilters.search.trim().toLowerCase();
    return payments.filter((payment) => {
      const haystack = [
        payment.userId?.name,
        payment.userId?.email,
        getBookingName(payment),
        payment.provider,
        payment.status,
        payment.gatewayRef,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || haystack.includes(keyword);
      const matchesStatus = appliedFilters.status === "all" || payment.status === appliedFilters.status;
      const matchesDate = isWithinDateRange(payment.createdAt, appliedFilters.startDate, appliedFilters.endDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [payments, appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters({
      search,
      status: statusFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
    });
    setHasAppliedFilters(true);
  };

  const resetBrowseFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setAppliedFilters({
      search: "",
      status: "all",
      startDate: "",
      endDate: "",
    });
    setHasAppliedFilters(false);
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Payment Records</h1>
      <p className="admin-page__subtitle">Monitor payment history, booking links, and verification timestamps.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}

      <div className="admin-card admin-card--padded" style={{ marginBottom: 16 }}>
        <div className="admin-payments-toolbar">
          <input
            className="admin-input"
            type="search"
            placeholder="Search traveler, booking, or gateway reference"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="initiated">Initiated</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
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
            disabled={!search && statusFilter === "all" && !startDateFilter && !endDateFilter}
          >
            Reset filters
          </button>
        </div>
      </div>

      {loading ? (
        <p className="admin-loading">Loading payments...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          {!hasAppliedFilters ? (
            <p className="admin-empty">Apply filters to view payment details.</p>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Traveler</th>
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
                      <td>
                        <div className="admin-payments-meta">
                          <strong>{payment.userId?.name || "Unknown"}</strong>
                          <small>{payment.userId?.email || "-"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="admin-payments-meta">
                          <strong>{getBookingName(payment)}</strong>
                          <small>{formatLabel(payment.bookingId?.bookingStatus || "pending")} booking</small>
                        </div>
                      </td>
                      <td>{`${payment.currency || "NPR"} ${Number(payment.amount || 0).toLocaleString()}`}</td>
                      <td>
                        <span className={`admin-badge admin-badge--${resolvePaymentTone(payment.status)}`}>
                          {formatLabel(payment.status)}
                        </span>
                      </td>
                      <td>{payment.gatewayRef || "-"}</td>
                      <td>
                        <div className="admin-payments-meta">
                          <small>Created: {formatDateTime(payment.createdAt)}</small>
                          {payment.verifiedAt && <small>Verified: {formatDateTime(payment.verifiedAt)}</small>}
                          {payment.bookingId?.paidAt && <small>Paid: {formatDateTime(payment.bookingId.paidAt)}</small>}
                          {payment.refundedAt && <small>Refunded: {formatDateTime(payment.refundedAt)}</small>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredPayments.length && <p className="admin-empty">No payments match the applied filters.</p>}
            </>
          )}
        </div>
      )}

      <style>{`
        .admin-payments-toolbar {
          display: grid;
          grid-template-columns: minmax(260px, 1.5fr) repeat(3, minmax(180px, 0.6fr));
          gap: 12px;
        }

        .admin-payments-meta {
          display: grid;
          gap: 4px;
        }

        .admin-payments-meta small,
        .admin-empty {
          color: #64748b;
        }

        .admin-empty {
          padding: 18px;
        }

        @media (max-width: 780px) {
          .admin-payments-toolbar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function getBookingName(payment) {
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

function resolvePaymentTone(status) {
  if (status === "success") return "success";
  if (status === "failed" || status === "refunded") return "danger";
  return "warning";
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
