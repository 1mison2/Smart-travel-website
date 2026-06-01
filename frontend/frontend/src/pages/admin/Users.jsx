import React, { useEffect, useMemo, useState } from "react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import { useAdminUi } from "../../components/admin/adminUiContextValue";
import { formatAdminDate, sortItems } from "../../utils/admin";
import api from "../../utils/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [selectedIds, setSelectedIds] = useState([]);
  const { showToast } = useAdminUi();

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

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const nextUsers = users.filter((user) => {
      const haystack = [user.name, user.email, user.role].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !normalized || haystack.includes(normalized);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "blocked" && user.isBlocked) ||
        (statusFilter === "active" && !user.isBlocked) ||
        (statusFilter === "admin" && user.role === "admin");
      return matchesSearch && matchesStatus;
    });

    return sortItems(nextUsers, sortBy, sortBy === "createdAt" ? "desc" : "asc");
  }, [users, search, sortBy, statusFilter]);

  const onToggleBlock = async (user) => {
    try {
      await api.put(`/api/admin/users/${user._id}/block`, { isBlocked: !user.isBlocked });
      setUsers((prev) =>
        prev.map((item) => (item._id === user._id ? { ...item, isBlocked: !item.isBlocked } : item))
      );
      showToast({
        title: user.isBlocked ? "User unblocked" : "User blocked",
        message: `${user.name || user.email || "User"} was ${user.isBlocked ? "restored" : "restricted"}.`,
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update user");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/api/admin/users/${id}`);
      setUsers((prev) => prev.filter((item) => item._id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      showToast({ title: "User deleted", message: "The account was removed from admin records." });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete user");
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === filteredUsers.length ? [] : filteredUsers.map((user) => user._id)));
  };

  const onBulkBlock = async (shouldBlock) => {
    const selectedUsers = users.filter((user) => selectedIds.includes(user._id));
    await Promise.all(
      selectedUsers.map((user) => api.put(`/api/admin/users/${user._id}/block`, { isBlocked: shouldBlock }))
    );
    setUsers((prev) => prev.map((user) => (selectedIds.includes(user._id) ? { ...user, isBlocked: shouldBlock } : user)));
    showToast({
      title: shouldBlock ? "Users blocked" : "Users unblocked",
      message: `${selectedUsers.length} account(s) were updated together.`,
    });
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">User Management</h1>
      <p className="admin-page__subtitle">Manage account access and keep the platform safe.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}
      <div className="admin-card admin-card--padded">
        <div className="admin-toolbar-grid admin-toolbar-grid--users">
          <input
            className="admin-input"
            type="search"
            placeholder="Search by name, email, or role"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="admin">Admins</option>
          </select>
          <select className="admin-input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="createdAt">Newest first</option>
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="role">Role</option>
          </select>
        </div>
        <div className="admin-actions admin-bulk-actions" style={{ marginTop: 14 }}>
          <button type="button" className="admin-btn admin-btn--muted" onClick={toggleSelectAll} disabled={!filteredUsers.length}>
            {selectedIds.length === filteredUsers.length && filteredUsers.length ? "Clear selection" : "Select all shown"}
          </button>
          <button type="button" className="admin-btn admin-btn--warning" onClick={() => onBulkBlock(true)} disabled={!selectedIds.length}>
            Block selected
          </button>
          <button type="button" className="admin-btn admin-btn--success" onClick={() => onBulkBlock(false)} disabled={!selectedIds.length}>
            Unblock selected
          </button>
        </div>
      </div>
      {loading ? (
        <p className="admin-loading">Loading users...</p>
      ) : filteredUsers.length ? (
        <div className="admin-users-grid">
          {filteredUsers.map((user) => (
            <article key={user._id} className="admin-card admin-card--padded admin-user-card">
              <div className="admin-user-card__head">
                <input type="checkbox" checked={selectedIds.includes(user._id)} onChange={() => toggleSelected(user._id)} />
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
                <div className="admin-user-card__meta-item">
                  <span>Joined</span>
                  <strong>{formatAdminDate(user.createdAt)}</strong>
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
      ) : (
        <AdminEmptyState
          title="No users match the current filters"
          copy="Try a broader search or switch the status filter to see more accounts."
        />
      )}
      <style>{`
        .admin-toolbar-grid--users {
          display: grid;
          grid-template-columns: minmax(260px, 1.6fr) repeat(2, minmax(180px, 0.7fr));
          gap: 12px;
        }
        .admin-bulk-actions {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          flex-wrap: wrap;
        }
        .admin-bulk-actions .admin-btn {
          min-width: 150px;
        }

        @media (max-width: 820px) {
          .admin-toolbar-grid--users {
            grid-template-columns: 1fr;
          }
          .admin-bulk-actions .admin-btn {
            flex: 1 1 160px;
          }
        }
      `}</style>
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
