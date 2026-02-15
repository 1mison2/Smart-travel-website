import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/admin/posts");
      setPosts(data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const onApprove = async (id) => {
    try {
      const { data } = await api.put(`/api/admin/posts/${id}/approve`);
      setPosts((prev) => prev.map((item) => (item._id === id ? data.post : item)));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve post");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/api/admin/posts/${id}`);
      setPosts((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete post");
    }
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Post Moderation</h1>
      <p className="admin-page__subtitle">Approve community posts and remove low-quality content.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}
      {loading ? (
        <p className="admin-loading">Loading posts...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Author</th>
                <th>Content</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id}>
                  <td>{post.userId?.name || "Unknown"}</td>
                  <td>{post.content}</td>
                  <td>
                    <span
                      className={`admin-badge ${
                        post.status === "approved"
                          ? "admin-badge--success"
                          : "admin-badge--warning"
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                    {post.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => onApprove(post._id)}
                        className="admin-btn admin-btn--success"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(post._id)}
                      className="admin-btn admin-btn--danger"
                    >
                      Delete
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
