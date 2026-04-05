import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/users");
      setUsers(data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onToggleBlock = async (user) => {
    try {
      await api.put(`/api/admin/users/${user._id}/block`, { isBlocked: !user.isBlocked });
      setUsers((prev) =>
        prev.map((item) => (item._id === user._id ? { ...item, isBlocked: !item.isBlocked } : item))
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update user");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/api/admin/users/${id}`);
      setUsers((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete user");
    }
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">User Management</h1>
      <p className="admin-page__subtitle">Manage account access and keep the platform safe.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading users...</p>
      ) : (
        <div className="admin-users-grid">
          {users.map((user) => (
            <article key={user._id} className="admin-card admin-card--padded admin-user-card">
              <div className="admin-user-card__head">
                <div className="admin-avatar-chip">{initials(user.name || user.email)}</div>
                <div className="admin-user-card__identity">
                  <h2>{user.name || "Traveler"}</h2>
                  <p>{user.email}</p>
                </div>
              </div>

              <div className="admin-user-card__meta">
                <div className="admin-user-card__meta-item">
                  <span>Role</span>
                  <strong>{user.role}</strong>
                </div>
                <div className="admin-user-card__meta-item">
                  <span>Status</span>
                  {user.isBlocked ? (
                    <span className="admin-badge admin-badge--danger">Blocked</span>
                  ) : (
                    <span className="admin-badge admin-badge--success">Active</span>
                  )}
                </div>
              </div>

              <div className="admin-user-card__actions">
                <button
                  type="button"
                  onClick={() => onToggleBlock(user)}
                  className="admin-btn admin-btn--warning"
                >
                  {user.isBlocked ? "Unblock" : "Block"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(user._id)}
                  className="admin-btn admin-btn--danger"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function initials(value) {
  return String(value || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
