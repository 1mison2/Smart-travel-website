import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const getStats = (payments) =>
  payments.reduce(
    (acc, payment) => {
      acc.total += 1;
      if (payment.status === "success") acc.success += 1;
      else if (payment.status === "failed") acc.failed += 1;
      else acc.pending += 1;
      return acc;
    },
    { total: 0, success: 0, failed: 0, pending: 0 }
  );

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="travel-shell payment-history-shell">
      <div className="travel-container" style={{ maxWidth: 1050 }}>
        <header className="travel-hero payment-history-hero">
          <div>
            <p className="travel-kicker">Payments</p>
            <h1 className="travel-title" style={{ fontSize: "2.1rem", marginTop: "8px" }}>
              Your payment history
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track Khalti transactions, status changes, and booking confirmations.
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
              <p>Failed</p>
              <strong>{stats.failed}</strong>
            </div>
          </div>
        )}

        {!loading && payments.length === 0 && (
          <div className="travel-card payment-empty" style={{ marginTop: "16px" }}>
            <p className="text-sm text-slate-600">No payments yet. Book a package to see payments here.</p>
            <Link to="/trip-packages" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline">
              Browse trip packages
            </Link>
          </div>
        )}

        {!loading && payments.length > 0 && (
          <div className="travel-card payment-table" style={{ marginTop: "16px" }}>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Booking</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Gateway Ref</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{payment.provider}</td>
                    <td>{payment.bookingId?._id || "-"}</td>
                    <td>NPR {payment.amount}</td>
                    <td>
                      <span
                        className={`payment-badge ${
                          payment.status === "success"
                            ? "payment-badge--success"
                            : payment.status === "failed"
                            ? "payment-badge--danger"
                            : "payment-badge--warning"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td>{payment.gatewayRef || "-"}</td>
                    <td>{new Date(payment.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
