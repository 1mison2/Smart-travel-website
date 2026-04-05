import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import api from "../utils/api";

export default function DestinationReviewPanel({
  destination,
  title = "Traveler reviews",
  subtitle = "See what people thought and add your own review.",
  emptyText = "No reviews yet. Be the first to share your experience.",
}) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadReviews = async () => {
    if (!destination) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/api/reviews/${encodeURIComponent(destination)}`);
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setSummary(data || null);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [destination]);

  const createReview = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await api.post("/api/reviews/create", { destination, rating, reviewText });
      setReviewText("");
      setMessage("Review submitted successfully.");
      setError("");
      await loadReviews();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit review");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  if (!destination) return null;

  return (
    <section className="hub-section-panel">
      <div className="section-head">
        <div>
          <p className="section-head__eyebrow">Reviews</p>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="travel-badge">For {destination}</span>
      </div>

      <div className="travel-grid-2">
        <article className="travel-summary">
          <div className="place-review-panel__summary">
            <div>
              <p className="place-review-panel__label">Average rating</p>
              <strong>{summary?.averageRating || 0}/5</strong>
            </div>
            <div>
              <p className="place-review-panel__label">Total reviews</p>
              <strong>{summary?.total || 0}</strong>
            </div>
          </div>

          <form onSubmit={createReview} className="hub-form">
            <select
              className="travel-input"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} stars
                </option>
              ))}
            </select>
            <textarea
              className="travel-textarea"
              placeholder={`Write your review for ${destination}...`}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
            />
            <button type="submit" className="travel-btn travel-btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit review"}
            </button>
          </form>

          {message && <p className="travel-alert travel-alert-success">{message}</p>}
          {error && <p className="travel-alert travel-alert-error">{error}</p>}
        </article>

        <article className="travel-summary">
          <div className="section-head section-head--tight">
            <div>
              <p className="section-head__eyebrow">Recent Reviews</p>
              <h2>Traveler impressions</h2>
            </div>
          </div>

          {loading ? (
            <p className="dashboard-note">Loading reviews...</p>
          ) : reviews.length ? (
            <div className="place-reviews__grid">
              {reviews.map((review) => (
                <article key={review._id} className="travel-card place-review-card">
                  <div className="place-review-card__head">
                    <p>{review.userId?.name || "Traveler"}</p>
                    <span>
                      <Star size={13} fill="currentColor" />
                      {" "}
                      {Number(review.rating || 0).toFixed(1)} / 5
                    </span>
                  </div>
                  <p>{review.reviewText}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="hub-copy">{emptyText}</p>
          )}
        </article>
      </div>
    </section>
  );
}
