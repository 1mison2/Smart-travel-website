import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import AdminToastStack from "../../components/admin/AdminToastStack";
import { AdminUiProvider } from "../../components/admin/AdminUiContext";
import Sidebar from "../../components/admin/Sidebar";
import NotificationCountBadge from "../../components/NotificationCountBadge";
import { useAuth } from "../../context/AuthContext";
import "./AdminPanel.css";

const adminSearchTargets = [
  { label: "Dashboard", to: "/admin", keywords: ["overview", "analytics", "stats", "dashboard"] },
  { label: "Users", to: "/admin/users", keywords: ["traveler", "account", "block", "users"] },
  { label: "Locations", to: "/admin/locations", keywords: ["destination", "place", "map", "locations"] },
  { label: "Listings", to: "/admin/listings", keywords: ["hotel", "activity", "restaurant", "listing"] },
  { label: "Bookings", to: "/admin/bookings", keywords: ["reservation", "refund", "booking"] },
  { label: "Trip Packages", to: "/admin/trip-packages", keywords: ["package", "tour", "itinerary"] },
  { label: "Payments", to: "/admin/payments", keywords: ["transaction", "revenue", "payment"] },
  { label: "Community", to: "/admin/posts", keywords: ["post", "review", "moderation", "community"] },
  { label: "Notifications", to: "/admin/notifications", keywords: ["alerts", "messages", "notifications"] },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profileMenuRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("admin-global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!profileOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
    };
  }, [profileOpen]);

  const currentPage = useMemo(() => {
    const match = [...adminSearchTargets].reverse().find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
    return match?.label || "Dashboard";
  }, [location.pathname]);

  const searchMatches = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return [];
    return adminSearchTargets
      .filter((item) => [item.label, ...(item.keywords || [])].join(" ").toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [searchTerm]);

  const adminName = user?.name || "mission";

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const goTo = (to) => {
    navigate(to);
    setSearchTerm("");
    setMobileNavOpen(false);
  };

  return (
    <AdminUiProvider>
      <div className={darkMode ? "dark" : ""}>
        <div className="admin-panel-surface min-h-screen text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
          <div className="flex min-h-screen">
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} onLogout={onLogout} />

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-20 border-b border-white/70 bg-white/82 px-4 shadow-sm shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82 sm:px-6">
                <div className="flex min-h-20 items-center gap-3 py-3">
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu size={19} />
                  </button>

                  <div className="hidden min-w-[190px] sm:block">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Link to="/admin" className="text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300">Admin</Link>
                      <span>/</span>
                      <span className="text-slate-900 dark:text-white">{currentPage}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Welcome back, {adminName}</p>
                  </div>

                  <div className="relative min-w-0 flex-1">
                    <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 shadow-sm transition focus-within:border-teal-400 focus-within:bg-white focus-within:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:focus-within:bg-slate-900" htmlFor="admin-global-search">
                      <Search size={17} className="shrink-0 text-slate-400" />
                      <input
                        id="admin-global-search"
                        type="search"
                        placeholder="Search users, bookings, payments..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      />
                      <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm sm:inline-flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Ctrl K
                      </kbd>
                    </label>
                    {searchMatches.length ? (
                      <div className="absolute left-0 right-0 top-14 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
                        {searchMatches.map((item) => (
                          <button
                            key={item.to}
                            type="button"
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => goTo(item.to)}
                          >
                            <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
                            <span className="text-xs text-slate-500">{item.keywords.slice(0, 2).join(" / ")}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDarkMode((value) => !value)}
                    className={`admin-theme-toggle ${darkMode ? "is-on" : ""}`}
                    aria-label="Toggle dark mode"
                  >
                    <span>
                      {darkMode ? <Moon size={15} /> : <Sun size={15} />}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="admin-notification-button relative inline-flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    aria-label="Notifications"
                    onClick={() => goTo("/admin/notifications")}
                  >
                    <Bell size={18} />
                    <NotificationCountBadge className="admin-notification-badge" />
                  </button>

                  <div className="relative" ref={profileMenuRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen((value) => !value)}
                      className="admin-profile-button flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-sky-500 text-xs font-bold text-white dark:from-cyan-400 dark:to-teal-300 dark:text-slate-950">
                        {initials(adminName)}
                      </span>
                      <span className="hidden text-left sm:block">
                        <span className="block text-xs font-semibold text-slate-900 dark:text-white">{adminName}</span>
                        <span className="block text-[11px] text-emerald-600 dark:text-emerald-300">Active admin</span>
                      </span>
                    </button>
                    {profileOpen ? (
                      <div className="absolute right-0 top-12 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
                        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Welcome back, {adminName}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Session secured for Smart Travel Nepal.</p>
                        </div>
                        <button type="button" onClick={onLogout} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
                          Logout
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </header>

              <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">
                <div className="mx-auto w-full max-w-[1540px]">
                  <Outlet />
                </div>
              </main>
            </div>
          </div>

          {mobileNavOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button type="button" className="absolute inset-0 bg-slate-950/70" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation overlay" />
              <div className="absolute left-0 top-0 h-full w-80 max-w-[88vw] bg-slate-950 p-4 text-white shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-slate-950"><LayoutDashboard size={18} /></span>
                    <span className="font-semibold">Admin Menu</span>
                  </div>
                  <button type="button" onClick={() => setMobileNavOpen(false)} className="grid size-9 place-items-center rounded-lg bg-slate-900">
                    <X size={18} />
                  </button>
                </div>
                <div className="grid gap-1">
                  {adminSearchTargets.map((item) => (
                    <button key={item.to} type="button" onClick={() => goTo(item.to)} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white">
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <AdminToastStack />
        </div>
      </div>
    </AdminUiProvider>
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
