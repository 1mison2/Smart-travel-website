import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Search } from "lucide-react";
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
      <Sidebar adminName={user?.name || "Admin"} onLogout={onLogout} />
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
            <label className="admin-search">
              <Search size={16} />
              <input type="text" placeholder="Search users, destinations, packages..." />
            </label>
            <NotificationBell className="admin-notif-btn" />
            <button type="button" className="admin-btn admin-btn--primary admin-btn--header" onClick={() => navigate("/admin/locations")}>
              <Plus size={16} />
              Add Destination
            </button>
            <button type="button" className="admin-topbar__profile" onClick={() => navigate("/profile")}>
              <span>{initials(user?.name || "Admin")}</span>
              <div>
                <strong>{user?.name || "Admin"}</strong>
                <small>{user?.email || "admin@smarttravel.com"}</small>
              </div>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function initials(value) {
  return String(value || "AD")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
