import React, { useEffect, useState } from "react";
import api from "../../utils/api";

const initialStats = {
  totalUsers: 0,
  totalLocations: 0,
  totalBookings: 0,
  totalPosts: 0,
  totalRevenue: 0,
};

const statCards = [
  { key: "totalUsers", label: "Total Users" },
  { key: "totalLocations", label: "Total Locations" },
  { key: "totalBookings", label: "Total Bookings" },
  { key: "totalPosts", label: "Total Posts" },
  { key: "totalRevenue", label: "Total Revenue" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/admin/stats");
        setStats(data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) return <p className="admin-loading">Loading dashboard...</p>;
  if (error) return <p className="admin-alert admin-alert--error">{error}</p>;

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Dashboard Overview</h1>
      <p className="admin-page__subtitle">Live snapshot of platform activity and performance.</p>
      <div className="admin-stats">
        {statCards.map((card) => (
          <article key={card.key} className="admin-stat">
            <p className="admin-stat__label">{card.label}</p>
            <p className="admin-stat__value">
              {card.key === "totalRevenue" ? `$${Number(stats[card.key] || 0).toFixed(2)}` : stats[card.key]}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
