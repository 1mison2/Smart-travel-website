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
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

export default function Sidebar() {
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
    </aside>
  );
}
