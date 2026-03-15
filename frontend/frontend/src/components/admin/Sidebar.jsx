import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, MapPinned, BookOpenCheck, MessageSquare, CreditCard, Building2, Bell, Briefcase } from "lucide-react";
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
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export default function Sidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <h1 className="admin-brand__title">Smart Travel Admin</h1>
        <p className="admin-brand__sub">Explore, Plan and Connect</p>
      </div>
      <nav className="admin-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `admin-nav__link ${isActive ? "is-active" : ""}`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
            {label === "Notifications" && (
              <NotificationCountBadge className="admin-nav__badge" />
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
