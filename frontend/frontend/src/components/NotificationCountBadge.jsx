import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const NOTIFICATION_POLL_MS = 15000;

export default function NotificationCountBadge({ className = "notif-badge" }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);

  useEffect(() => {
    if (!user?._id) return undefined;

    let active = true;

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get("/api/notifications/me?limit=1");
        if (!active) return;
        const count = Number(data?.unreadCount || 0);
        unreadCountRef.current = count;
        setUnreadCount(count);
      } catch {
        // ignore notification polling errors
      }
    };

    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, NOTIFICATION_POLL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [user?._id]);

  if (!user || unreadCount <= 0) return null;

  return <span className={className}>{unreadCount > 99 ? "99+" : unreadCount}</span>;
}
