import React from "react";
import { NavLink } from "react-router-dom";
import {
  Bell,
  BookOpenCheck,
  Building2,
  CreditCard,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  Sparkles,
  Users,
  Briefcase,
  LogOut,
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
  { to: "/admin/posts", label: "Community", icon: MessageSquare },
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand admin-brand--merged">
        <div className="admin-brand__head">
          <div className="admin-brand__mark">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="admin-brand__title">Smart Travel Nepal</h1>
          </div>
        </div>
      </div>

      <nav className="admin-nav">
        {links.map(({ to, label, icon, end }) => {
          const LinkIcon = icon;
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-nav__link ${isActive ? "is-active" : ""}`}
            >
              <span className="admin-nav__icon"><LinkIcon size={17} /></span>
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
      <NavLink
        to="/admin/notifications"
        className={({ isActive }) => `admin-nav__link ${isActive ? "is-active" : ""}`}
      >
        <span className="admin-nav__icon"><Bell size={17} /></span>
        <span>Notifications</span>
        <NotificationCountBadge className="admin-nav__badge" />
      </NavLink>
      <button type="button" className="admin-sidebar__logout" onClick={onLogout}>
        <span className="admin-nav__icon">
          <LogOut size={17} />
        </span>
        <span>Logout</span>
      </button>
    </aside>
  );
}
