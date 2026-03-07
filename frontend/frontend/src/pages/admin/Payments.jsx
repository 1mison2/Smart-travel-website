import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function AdminPayments() {
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
        setError(err?.response?.data?.message || "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Payment Records</h1>
      <p className="admin-page__subtitle">Monitor Khalti/eSewa sandbox transactions.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading payments...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Booking</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Gateway Ref</th>
                <th>Created</th>
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
                      className={`admin-badge ${
                        payment.status === "success"
                          ? "admin-badge--success"
                          : payment.status === "failed"
                          ? "admin-badge--danger"
                          : "admin-badge--warning"
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
    </section>
  );
}
