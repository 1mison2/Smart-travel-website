import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const HIDE_ON_PATHS = new Set(["/", "/login", "/signup", "/forgot-password", "/reset-password"]);

export default function GlobalHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;
  if (HIDE_ON_PATHS.has(location.pathname)) return null;

  const dashboardPath = user.role === "admin" ? "/admin" : "/dashboard";
  const onDashboard = location.pathname === dashboardPath;
  if (onDashboard) return null;

  return (
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
      </div>
    </header>
  );
}
