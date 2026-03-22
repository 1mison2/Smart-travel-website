import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/notifications/me?limit=120");
        setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
        setUnreadCount(Number(data?.unreadCount || 0));
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onMarkAllRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to mark all as read");
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-page__head">
        <div>
          <h1 className="admin-page__title">Notifications</h1>
          <p className="admin-page__subtitle">Review your recent system notifications.</p>
        </div>
        <div className="admin-page__actions">
          <button
            type="button"
            className="admin-btn admin-btn--muted"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </button>
        </div>
      </div>

      {error && <p className="admin-alert admin-alert--error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="admin-card admin-card--padded">
          <p className="admin-loading">No notifications found.</p>
        </div>
      ) : (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((item) => (
                <tr key={item._id}>
                  <td>{item.title}</td>
                  <td>{item.message}</td>
                  <td>{item.type || "-"}</td>
                  <td>
                    <span
                      className={`admin-badge ${
                        item.isRead ? "admin-badge--success" : "admin-badge--warning"
                      }`}
                    >
                      {item.isRead ? "read" : "unread"}
                    </span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>
                    <details className="admin-notif-details">
                      <summary>View details</summary>
                      <div className="admin-notif-details__panel">
                        <div className="admin-notif-details__grid">
                          <div>
                            <span>Status</span>
                            <strong>{item.isRead ? "Read" : "Unread"}</strong>
                          </div>
                          <div>
                            <span>Read at</span>
                            <strong>{item.readAt ? new Date(item.readAt).toLocaleString() : "-"}</strong>
                          </div>
                        </div>
                        {(item.meta?.bookingId || item.meta?.paymentId) && (
                          <div className="admin-notif-details__meta-lines">
                            {item.meta?.bookingId && (
                              <div>
                                <span>Booking ID</span>
                                <strong title={item.meta.bookingId}>{item.meta.bookingId}</strong>
                              </div>
                            )}
                            {item.meta?.paymentId && (
                              <div>
                                <span>Payment ID</span>
                                <strong title={item.meta.paymentId}>{item.meta.paymentId}</strong>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
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
