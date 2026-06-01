import React from "react";
import { NavLink } from "react-router-dom";
import {
  Bell,
  BookOpenCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquare,
  Mountain,
  PackageOpen,
  Users,
} from "lucide-react";
import NotificationCountBadge from "../NotificationCountBadge";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/locations", label: "Locations", icon: MapPinned },
  { to: "/admin/listings", label: "Listings", icon: Building2 },
  { to: "/admin/bookings", label: "Bookings", icon: BookOpenCheck },
  { to: "/admin/trip-packages", label: "Trip Packages", icon: PackageOpen },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/posts", label: "Community", icon: MessageSquare },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, hasBadge: true },
];

export default function Sidebar({ collapsed, onToggle, onLogout }) {
  return (
    <aside
      className={`sticky top-0 z-30 hidden h-screen shrink-0 border-r border-slate-900/80 bg-[#07111f] text-slate-200 shadow-2xl shadow-slate-950/30 transition-[width] duration-300 ease-out lg:flex lg:flex-col ${
        collapsed ? "w-[84px]" : "w-[280px]"
      }`}
    >
      <div className="admin-sidebar-pattern pointer-events-none absolute inset-0 opacity-100" />
      <div className="relative flex h-20 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-teal-400 text-slate-950 shadow-lg shadow-cyan-950/30">
          <Mountain size={22} />
        </div>
        <div className={`min-w-0 transition-opacity duration-200 ${collapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}>
          <h1 className="truncate text-base font-semibold text-white">Smart Travel Nepal</h1>
          <p className="truncate text-xs text-cyan-100/70">Admin operations</p>
        </div>
      </div>

      <div className="relative flex items-center justify-end border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:scale-105 hover:border-cyan-300/40 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {links.map(({ to, label, icon, end, hasBadge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              [
                "group relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition duration-200",
                isActive
                  ? "bg-white text-slate-950 shadow-lg shadow-cyan-950/20"
                  : "text-slate-400 hover:translate-x-0.5 hover:bg-white/10 hover:text-white",
                collapsed ? "justify-center" : "",
              ].join(" ")
            }
          >
            {React.createElement(icon, { size: 18, className: "shrink-0" })}
            <span className={`truncate transition-opacity duration-200 ${collapsed ? "sr-only" : "opacity-100"}`}>{label}</span>
            {hasBadge ? (
              <NotificationCountBadge
                className={`grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold leading-5 text-white ring-2 ring-slate-950 ${
                  collapsed ? "absolute right-1 top-1" : "ml-auto"
                }`}
              />
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
          className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10 hover:text-rose-100 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={18} />
          <span className={collapsed ? "sr-only" : ""}>Logout</span>
        </button>
      </div>
    </aside>
  );
}
