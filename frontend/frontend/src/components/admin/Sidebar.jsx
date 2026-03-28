import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpenCheck,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  Briefcase,
} from "lucide-react";
import NotificationCountBadge from "../NotificationCountBadge";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/locations", label: "Locations", icon: MapPinned },
  { to: "/admin/listings", label: "Listings", icon: Building2 },
  { to: "/admin/bookings", label: "Bookings", icon: BookOpenCheck },
  { to: "/admin/trip-packages", label: "Trip Packages", icon: Briefcase },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/posts", label: "Posts", icon: MessageSquare },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

export default function Sidebar({ adminName = "Admin", onLogout }) {
  const navigate = useNavigate();

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand__mark">
          <Sparkles size={18} />
        </div>
        <div>
          <h1 className="admin-brand__title">Smart Travel Nepal</h1>
          <p className="admin-brand__sub">Admin intelligence workspace</p>
        </div>
      </div>

      <div className="admin-sidebar__profile">
        <div className="admin-sidebar__avatar">{initials(adminName)}</div>
        <div>
          <strong>{adminName}</strong>
          <small>Platform Administrator</small>
        </div>
      </div>

      <nav className="admin-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `admin-nav__link ${isActive ? "is-active" : ""}`}
          >
            <span className="admin-nav__icon"><Icon size={17} /></span>
            <span>{label}</span>
            {label === "Notifications" && <NotificationCountBadge className="admin-nav__badge" />}
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <button type="button" className="admin-sidebar__utility" onClick={() => navigate("/settings")}>
          <Settings size={16} />
          Settings
        </button>
        <button type="button" className="admin-sidebar__utility admin-sidebar__utility--danger" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
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
