import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/bookings");
      setBookings(data);
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

  const onDelete = async (id) => {
    try {
      await api.delete(`/api/admin/bookings/${id}`);
      setBookings((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete booking");
    }
  };

  const onUpdateStatus = async (id, bookingStatus) => {
    try {
      const { data } = await api.put(`/api/admin/bookings/${id}/status`, { bookingStatus });
      setBookings((prev) =>
        prev.map((item) => (item._id === id ? { ...item, ...data.booking } : item))
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update booking status");
    }
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Booking Management</h1>
      <p className="admin-page__subtitle">Review bookings, payment status, and remove invalid entries.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading bookings...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Location</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Booking</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>{booking.userId?.name || "Unknown"}</td>
                  <td>{booking.locationId?.name || "Unknown"}</td>
                  <td>{new Date(booking.date).toLocaleDateString()}</td>
                  <td>${booking.amount}</td>
                  <td>
                    <span
                      className={`admin-badge ${
                        booking.bookingStatus === "confirmed"
                          ? "admin-badge--success"
                          : booking.bookingStatus === "cancelled"
                          ? "admin-badge--danger"
                          : "admin-badge--warning"
                      }`}
                    >
                      {booking.bookingStatus || "pending"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        booking.paymentStatus === "paid"
                          ? "admin-badge--success"
                          : booking.paymentStatus === "failed"
                          ? "admin-badge--danger"
                          : "admin-badge--warning"
                      }`}
                    >
                      {booking.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(booking._id, "confirmed")}
                        className="admin-btn admin-btn--success"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(booking._id, "cancelled")}
                        className="admin-btn admin-btn--warning"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(booking._id)}
                        className="admin-btn admin-btn--danger"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
