import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const POLL_INTERVAL_MS = 15000;
const AUTO_DISMISS_MS = 7000;
const MAX_POPUPS = 4;

const keyForUser = (userId) => `st_seen_notification_ids_${userId}`;

const readSeenIds = (userId) => {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const writeSeenIds = (userId, idsSet) => {
  if (!userId) return;
  try {
    localStorage.setItem(keyForUser(userId), JSON.stringify(Array.from(idsSet).slice(-300)));
  } catch {
    // ignore storage write errors
  }
};

export default function NotificationPopups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [popups, setPopups] = useState([]);
  const initializedRef = useRef(false);
  const seenIdsRef = useRef(new Set());
  const dismissTimersRef = useRef(new Map());

  const dismissPopup = (id) => {
    setPopups((prev) => prev.filter((item) => item.id !== id));
    const timer = dismissTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimersRef.current.delete(id);
    }
  };

  const enqueuePopup = (notification) => {
    const id = String(notification._id || "");
    if (!id) return;

    setPopups((prev) => {
      const deduped = prev.filter((item) => item.id !== id);
      const next = [
        {
          id,
          title: notification.title || "Notification",
          message: notification.message || "",
          createdAt: notification.createdAt,
        },
        ...deduped,
      ].slice(0, MAX_POPUPS);
      return next;
    });

    const existing = dismissTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => dismissPopup(id), AUTO_DISMISS_MS);
    dismissTimersRef.current.set(id, timer);
  };

  useEffect(() => {
    setPopups([]);
    initializedRef.current = false;
    seenIdsRef.current = new Set();
    dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
    dismissTimersRef.current.clear();
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return undefined;

    let active = true;

    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/api/notifications/me?limit=30");
        if (!active) return;
        const notifications = Array.isArray(data?.notifications) ? data.notifications : [];
        const unread = notifications.filter((item) => !item?.isRead);

        if (!initializedRef.current) {
          const seen = readSeenIds(user._id);
          if (seen.size === 0) {
            unread.forEach((item) => seen.add(String(item._id)));
            writeSeenIds(user._id, seen);
          }
          seenIdsRef.current = seen;
          initializedRef.current = true;
          return;
        }

        let hasNew = false;
        unread.forEach((item) => {
          const id = String(item._id || "");
          if (!id || seenIdsRef.current.has(id)) return;
          seenIdsRef.current.add(id);
          enqueuePopup(item);
          hasNew = true;
        });

        if (hasNew) writeSeenIds(user._id, seenIdsRef.current);
      } catch {
        // silent fail; notification page still has full state
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
      dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
      dismissTimersRef.current.clear();
    };
  }, [user?._id]);

  if (!user || popups.length === 0) return null;

  return (
    <div className="notif-popups" aria-live="polite" aria-label="Live notifications">
      {popups.map((popup) => (
        <article
          key={popup.id}
          className="notif-toast"
          onClick={() => navigate("/notifications")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate("/notifications");
          }}
        >
          <div className="notif-toast__head">
            <p>{popup.title}</p>
            <button
              type="button"
              className="notif-toast__close"
              onClick={(e) => {
                e.stopPropagation();
                dismissPopup(popup.id);
              }}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
          <p className="notif-toast__message">{popup.message}</p>
        </article>
      ))}
    </div>
  );
}

