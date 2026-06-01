import React, { useEffect, useMemo, useState } from "react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import { useAdminUi } from "../../components/admin/adminUiContextValue";
import { formatAdminLabel } from "../../utils/admin";
import api from "../../utils/api";

export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { showToast } = useAdminUi();

  const loadPosts = async () => {
    try {
      setLoading(true);
      const [postsRes, reviewsRes] = await Promise.all([
        api.get("/api/admin/posts"),
        api.get("/api/admin/reviews"),
      ]);
      setPosts(Array.isArray(postsRes.data) ? postsRes.data : []);
      setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load community moderation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return posts.filter((post) => {
      const haystack = [post.userId?.name, post.title, post.destination, post.content, post.type, post.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalized || haystack.includes(normalized);
      const matchesStatus = statusFilter === "all" || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, search, statusFilter]);

  const filteredReviews = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return reviews.filter((review) => {
      const haystack = [review.userId?.name, review.destination, review.reviewText, review.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalized || haystack.includes(normalized);
      const matchesStatus = statusFilter === "all" || review.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reviews, search, statusFilter]);

  const onPostStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/api/admin/posts/${id}/status`, { status });
      setPosts((prev) => prev.map((item) => (item._id === id ? data.post : item)));
      showToast({ title: "Post updated", message: `The post is now ${formatAdminLabel(status)}.` });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update post");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/api/admin/posts/${id}`);
      setPosts((prev) => prev.filter((item) => item._id !== id));
      showToast({ title: "Post deleted", message: "The post was removed from the moderation queue." });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete post");
    }
  };

  const onReviewStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/api/admin/reviews/${id}/status`, { status });
      setReviews((prev) => prev.map((item) => (item._id === id ? data.review : item)));
      showToast({ title: "Review updated", message: `The review is now ${formatAdminLabel(status)}.` });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update review");
    }
  };

  const onDeleteReview = async (id) => {
    try {
      await api.delete(`/api/admin/reviews/${id}`);
      setReviews((prev) => prev.filter((item) => item._id !== id));
      showToast({ title: "Review deleted", message: "The review was removed from the moderation queue." });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete review");
    }
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Community Moderation</h1>
      <p className="admin-page__subtitle">Review traveler blogs, trip posts, and destination reviews from one moderation queue.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}
      <div className="admin-tab-actions" style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => setActiveTab("posts")} className={`admin-btn ${activeTab === "posts" ? "admin-btn--primary" : "admin-btn--muted"}`}>
          Posts
        </button>
        <button type="button" onClick={() => setActiveTab("reviews")} className={`admin-btn ${activeTab === "reviews" ? "admin-btn--primary" : "admin-btn--muted"}`}>
          Reviews
        </button>
      </div>
      <div className="admin-card admin-card--padded" style={{ marginBottom: 16 }}>
        <div className="admin-toolbar-grid admin-toolbar-grid--moderation">
          <input
            className="admin-input"
            type="search"
            placeholder="Search author, destination, title, or content"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="admin-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      {loading ? (
        <p className="admin-loading">Loading moderation queue...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          {activeTab === "posts" ? filteredPosts.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Author</th>
                  <th>Type</th>
                  <th>Content</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post._id}>
                    <td>{post.userId?.name || "Unknown"}</td>
                    <td>{post.type || "post"}</td>
                    <td>
                      <strong>{post.title || post.destination || "Untitled"}</strong>
                      <div className="admin-table__muted">{post.content}</div>
                    </td>
                    <td>
                      <span className={`admin-badge ${post.status === "approved" ? "admin-badge--success" : post.status === "rejected" ? "admin-badge--danger" : "admin-badge--warning"}`}>
                        {post.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {post.status === "pending" ? (
                          <button type="button" onClick={() => onPostStatus(post._id, "approved")} className="admin-btn admin-btn--success">
                            Approve
                          </button>
                        ) : null}
                        {post.status === "pending" ? (
                          <button type="button" onClick={() => onPostStatus(post._id, "rejected")} className="admin-btn admin-btn--warning">
                            Reject
                          </button>
                        ) : null}
                        {post.status === "approved" ? <span className="admin-table__muted">Already approved</span> : null}
                        {post.status === "rejected" ? <span className="admin-table__muted">Rejected</span> : null}
                        <button type="button" onClick={() => onDelete(post._id)} className="admin-btn admin-btn--danger">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <AdminEmptyState
              title="No posts matched"
              copy="Try a different keyword or status filter to continue moderating traveler posts."
            />
          ) : filteredReviews.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Author</th>
                  <th>Destination</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review) => (
                  <tr key={review._id}>
                    <td>{review.userId?.name || "Unknown"}</td>
                    <td>
                      <strong>{review.destination}</strong>
                      <div className="admin-table__muted">{review.reviewText}</div>
                    </td>
                    <td>{review.rating}/5</td>
                    <td>
                      <span className={`admin-badge ${review.status === "approved" ? "admin-badge--success" : review.status === "rejected" ? "admin-badge--danger" : "admin-badge--warning"}`}>
                        {review.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {review.status === "pending" ? (
                          <button type="button" onClick={() => onReviewStatus(review._id, "approved")} className="admin-btn admin-btn--success">
                            Approve
                          </button>
                        ) : null}
                        {review.status === "pending" ? (
                          <button type="button" onClick={() => onReviewStatus(review._id, "rejected")} className="admin-btn admin-btn--warning">
                            Reject
                          </button>
                        ) : null}
                        {review.status === "approved" ? <span className="admin-table__muted">Already approved</span> : null}
                        {review.status === "rejected" ? <span className="admin-table__muted">Rejected</span> : null}
                        <button type="button" onClick={() => onDeleteReview(review._id)} className="admin-btn admin-btn--danger">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <AdminEmptyState
              title="No reviews matched"
              copy="Try a different keyword or status filter to review destination feedback."
            />
          )}
        </div>
      )}
      <style>{`
        .admin-toolbar-grid--moderation {
          display: grid;
          grid-template-columns: minmax(260px, 1.5fr) minmax(180px, 0.6fr);
          gap: 12px;
        }

        @media (max-width: 720px) {
          .admin-toolbar-grid--moderation {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
