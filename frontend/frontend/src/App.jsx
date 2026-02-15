import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminLocations from "./pages/admin/Locations";
import AdminBookings from "./pages/admin/Bookings";
import AdminPosts from "./pages/admin/Posts";
import { useAuth } from "./context/AuthContext";

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to={user?.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route
        path="/admin"
        element={
          <AdminOnly>
            <AdminLayout />
          </AdminOnly>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="locations" element={<AdminLocations />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="posts" element={<AdminPosts />} />
      </Route>
    </Routes>
  );
}
