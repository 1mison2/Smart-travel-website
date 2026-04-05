import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const onPostStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/api/admin/posts/${id}/status`, { status });
      setPosts((prev) => prev.map((item) => (item._id === id ? data.post : item)));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update post");
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

  const onReviewStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/api/admin/reviews/${id}/status`, { status });
      setReviews((prev) => prev.map((item) => (item._id === id ? data.review : item)));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update review");
    }
  };

  const onDeleteReview = async (id) => {
    try {
      await api.delete(`/api/admin/reviews/${id}`);
      setReviews((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete review");
    }
  };

  return (
    <section className="admin-page">
      <h1 className="admin-page__title">Community Moderation</h1>
      <p className="admin-page__subtitle">Review traveler blogs, trip posts, and destination reviews from one moderation queue.</p>
      {error && <p className="admin-alert admin-alert--error">{error}</p>}
      <div className="admin-actions" style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => setActiveTab("posts")} className={`admin-btn ${activeTab === "posts" ? "admin-btn--primary" : "admin-btn--muted"}`}>
          Posts
        </button>
        <button type="button" onClick={() => setActiveTab("reviews")} className={`admin-btn ${activeTab === "reviews" ? "admin-btn--primary" : "admin-btn--muted"}`}>
          Reviews
        </button>
      </div>
      {loading ? (
        <p className="admin-loading">Loading moderation queue...</p>
      ) : (
        <div className="admin-card admin-table-wrap">
          {activeTab === "posts" ? (
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
                {posts.map((post) => (
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
                        {post.status !== "approved" ? (
                          <button type="button" onClick={() => onPostStatus(post._id, "approved")} className="admin-btn admin-btn--success">
                            Approve
                          </button>
                        ) : null}
                        {post.status !== "rejected" ? (
                          <button type="button" onClick={() => onPostStatus(post._id, "rejected")} className="admin-btn admin-btn--warning">
                            Reject
                          </button>
                        ) : null}
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
                {reviews.map((review) => (
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
                        {review.status !== "approved" ? (
                          <button type="button" onClick={() => onReviewStatus(review._id, "approved")} className="admin-btn admin-btn--success">
                            Approve
                          </button>
                        ) : null}
                        {review.status !== "rejected" ? (
                          <button type="button" onClick={() => onReviewStatus(review._id, "rejected")} className="admin-btn admin-btn--warning">
                            Reject
                          </button>
                        ) : null}
                        <button type="button" onClick={() => onDeleteReview(review._id)} className="admin-btn admin-btn--danger">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
