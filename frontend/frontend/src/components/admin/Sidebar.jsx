import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, MapPinned, BookOpenCheck, MessageSquare } from "lucide-react";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/locations", label: "Locations", icon: MapPinned },
  { to: "/admin/bookings", label: "Bookings", icon: BookOpenCheck },
  { to: "/admin/posts", label: "Posts", icon: MessageSquare },
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
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
