import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import Sidebar from "../../components/admin/Sidebar";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../../components/NotificationBell";
import "./AdminPanel.css";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [now]
  );

  const timeLabel = useMemo(
    () =>
      now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }),
    [now]
  );

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__intro">
            <p className="admin-topbar__kicker">Control Center</p>
            <h2 className="admin-topbar__title">Welcome back, {user?.name || "Admin"}</h2>
            <div className="admin-topbar__datetime">
              <span><CalendarDays size={14} /> {dateLabel}</span>
              <strong>{timeLabel}</strong>
            </div>
          </div>

          <div className="admin-topbar__actions">
            <NotificationBell className="admin-notif-btn" />
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
