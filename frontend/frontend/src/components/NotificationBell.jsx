import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const NOTIFICATION_POLL_MS = 15000;

export default function NotificationBell({
  className = "",
  badgeClassName = "notif-badge",
  pulseClassName = "notif-btn--pulse",
  iconSize = 18,
  onClick,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const unreadCountRef = useRef(0);
  const pulseTimerRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return undefined;

    let active = true;

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get("/api/notifications/me?limit=1");
        if (!active) return;
        const count = Number(data?.unreadCount || 0);
        if (count > unreadCountRef.current) {
          setPulse(true);
          if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
          pulseTimerRef.current = setTimeout(() => setPulse(false), 4000);
        }
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
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, [user?._id]);

  if (!user) return null;

  const handleClick = () => {
    setPulse(false);
    if (onClick) {
      onClick();
      return;
    }
    navigate("/notifications");
  };

  return (
    <button
      type="button"
      className={`notif-btn ${pulse ? pulseClassName : ""} ${className}`}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Notifications"
      }
      onClick={handleClick}
    >
      <Bell size={iconSize} />
      {unreadCount > 0 && (
        <span className={badgeClassName}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
