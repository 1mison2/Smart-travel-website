import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const HIDE_ON_PATHS = new Set(["/", "/login", "/signup", "/forgot-password", "/reset-password", "/map-explorer", "/dashboard"]);
const HIDE_ON_PREFIXES = ["/buddy", "/community"];

export default function GlobalHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;
  if (user.role === "admin") return null;
  if (HIDE_ON_PATHS.has(location.pathname)) return null;
  if (HIDE_ON_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return null;

  const dashboardPath = user.role === "admin" ? "/admin" : "/dashboard";

  return (
    <>
      <div className="global-header-spacer" aria-hidden="true" />
      <header className="global-header">
        <div className="global-header__inner">
          <button type="button" className="global-header__btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </button>
          <button type="button" className="global-header__btn global-header__btn--primary" onClick={() => navigate(dashboardPath)}>
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          <div className="global-header__spacer" />
          <NotificationBell className="global-header__notif" />
        </div>
      </header>
    </>
  );
}
