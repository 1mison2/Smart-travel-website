import React, { useEffect, useMemo, useState } from "react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import { useAdminUi } from "../../components/admin/adminUiContextValue";
import { formatAdminDateTime } from "../../utils/admin";
import api from "../../utils/api";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { showToast } = useAdminUi();

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

  const filteredNotifications = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return notifications.filter((item) => {
      const haystack = [item.title, item.message, item.type].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !normalized || haystack.includes(normalized);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "read" && item.isRead) ||
        (statusFilter === "unread" && !item.isRead);
      return matchesSearch && matchesStatus;
    });
  }, [notifications, search, statusFilter]);

  const onMarkAllRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
      window.dispatchEvent(new Event("notifications:changed"));
      setError("");
      showToast({ title: "Notifications updated", message: "All notifications were marked as read." });
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
      <div className="admin-card admin-card--padded">
        <div className="admin-toolbar-grid admin-toolbar-grid--notifications">
          <input
            className="admin-input"
            type="search"
            placeholder="Search title, message, or type"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>
      {loading ? (
        <p className="admin-loading">Loading notifications...</p>
      ) : filteredNotifications.length === 0 ? (
        <AdminEmptyState
          title="No notifications matched"
          copy="Try a broader search or switch the read-status filter to see more activity."
        />
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
              {filteredNotifications.map((item) => (
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
                  <td>{formatAdminDateTime(item.createdAt)}</td>
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
                            <strong>{item.readAt ? formatAdminDateTime(item.readAt) : "-"}</strong>
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
      <style>{`
        .admin-toolbar-grid--notifications {
          display: grid;
          grid-template-columns: minmax(260px, 1.5fr) minmax(180px, 0.6fr);
          gap: 12px;
          margin-top: 16px;
        }

        @media (max-width: 720px) {
          .admin-toolbar-grid--notifications {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
