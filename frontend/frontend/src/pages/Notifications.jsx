import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/notifications/me?limit=60");
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unreadCount || 0));
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onMarkRead = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notificationId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        )
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to mark notification as read");
    }
  };

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
    <div className="notifications-page">
      <header className="notifications-page__hero">
        <div>
          <p className="notifications-page__kicker">Notifications</p>
          <h1>Updates from your bookings and payments</h1>
          <p>{unreadCount} unread notification(s).</p>
        </div>
        <div className="notifications-page__actions">
          <button onClick={onMarkAllRead} disabled={!notifications.length || unreadCount === 0}>
            Mark All Read
          </button>
        </div>
      </header>

      {error && <p className="notifications-page__error">{error}</p>}
      {loading && <p className="notifications-page__hint">Loading notifications...</p>}
      {!loading && notifications.length === 0 && (
        <p className="notifications-page__hint">No notifications yet.</p>
      )}

      <section className="notifications-list">
        {notifications.map((item) => (
          <article key={item._id} className={`notification-card ${item.isRead ? "is-read" : ""}`}>
            <div className="notification-card__dot" aria-hidden />
            <div className="notification-card__body">
              <h2>{item.title}</h2>
              <p>{item.message}</p>
              <small>{formatDateTime(item.createdAt)}</small>
            </div>
            <button onClick={() => onMarkRead(item._id)} disabled={item.isRead}>
              {item.isRead ? "Read" : "Mark Read"}
            </button>
          </article>
        ))}
      </section>

      <style>{`
        .notifications-page {
          max-width: 920px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: #0f172a;
        }
        .notifications-page__hero {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(16, 185, 129, 0.12));
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 24px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          margin-bottom: 16px;
        }
        .notifications-page__kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.72rem;
          color: #0f766e;
          font-weight: 600;
        }
        .notifications-page__hero h1 { margin: 0 0 6px; font-size: clamp(1.6rem, 3vw, 2.2rem); }
        .notifications-page__hero p { margin: 0; color: #475569; }
        .notifications-page__actions { display: grid; gap: 8px; justify-items: end; }
        .notifications-page__actions a,
        .notifications-page__actions button {
          text-decoration: none;
          border: 1px solid rgba(15, 118, 110, 0.3);
          color: #0f766e;
          background: #fff;
          border-radius: 999px;
          padding: 9px 12px;
          font-weight: 600;
          font-size: 0.84rem;
          cursor: pointer;
        }
        .notifications-page__actions button:disabled { opacity: 0.5; cursor: not-allowed; }
        .notifications-page__error { color: #b91c1c; margin: 0 0 10px; }
        .notifications-page__hint { color: #475569; margin: 0; }
        .notifications-list { margin-top: 12px; display: grid; gap: 10px; }
        .notification-card {
          background: #fff;
          border: 1px solid rgba(16, 185, 129, 0.35);
          border-radius: 14px;
          padding: 12px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
        }
        .notification-card.is-read {
          border-color: rgba(148, 163, 184, 0.28);
          background: #fcfcfd;
        }
        .notification-card__dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #10b981;
        }
        .notification-card.is-read .notification-card__dot { background: #94a3b8; }
        .notification-card__body h2 { margin: 0 0 2px; font-size: 1rem; }
        .notification-card__body p { margin: 0 0 3px; color: #334155; }
        .notification-card__body small { color: #64748b; }
        .notification-card button {
          border: 1px solid rgba(15, 118, 110, 0.3);
          border-radius: 999px;
          padding: 8px 10px;
          background: #fff;
          color: #0f766e;
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
        }
        .notification-card button:disabled { opacity: 0.6; cursor: default; }
        @media (max-width: 760px) {
          .notifications-page__hero { flex-direction: column; align-items: flex-start; }
          .notifications-page__actions { justify-items: start; }
          .notification-card { grid-template-columns: 1fr; }
          .notification-card__dot { display: none; }
        }
      `}</style>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
