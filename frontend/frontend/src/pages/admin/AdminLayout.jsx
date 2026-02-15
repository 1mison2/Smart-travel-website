import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../../components/admin/Sidebar";
import { useAuth } from "../../context/AuthContext";
import "./AdminPanel.css";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar__kicker">Admin Panel</p>
            <h2 className="admin-topbar__title">
              Welcome, {user?.name || "Admin"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="admin-btn admin-btn--muted"
          >
            Logout
          </button>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
