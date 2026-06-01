import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import api from "../../utils/api";
import SectionSkeleton from "./SectionSkeleton";
import { useAuth } from "../../context/AuthContext";

export default function DestinationReviewsSection({ onNotify }) {
  const { user } = useAuth();
  const [destination, setDestination] = useState("Pokhara");
  const [summary, setSummary] = useState({ destination: "Pokhara", averageRating: 0, total: 0, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({ destination: "", rating: 5, reviewText: "" });

  const loadReviews = async (target = destination) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/reviews/${encodeURIComponent(target)}`, { params: { mine: "true" } });
      setSummary({
        destination: data?.destination || target,
        averageRating: data?.averageRating || 0,
        total: data?.total || 0,
        reviews: data?.reviews || [],
      });
      setDestination(target);
    } catch {
      onNotify?.({ type: "error", message: "Failed to load destination reviews." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews("Pokhara");
  }, []);

  const isMine = (review) => String(review?.userId?._id || review?.userId) === String(user?._id || user?.id);

  const startEdit = (review) => {
    setEditingId(review._id);
    setEditForm({
      destination: review.destination || destination,
      rating: review.rating || 5,
      reviewText: review.reviewText || "",
    });
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditForm({ destination: "", rating: 5, reviewText: "" });
  };

  const saveEdit = async (reviewId) => {
    try {
      const nextDestination = editForm.destination || destination;
      await api.put(`/api/reviews/${reviewId}`, { ...editForm, destination: nextDestination });
      cancelEdit();
      await loadReviews(nextDestination);
      onNotify?.({ type: "success", message: "Review updated and sent for moderation." });
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Failed to update review." });
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await api.delete(`/api/reviews/${reviewId}`);
      cancelEdit();
      await loadReviews(destination);
      onNotify?.({ type: "success", message: "Review deleted." });
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Failed to delete review." });
    }
  };

  if (loading) return <SectionSkeleton cards={2} />;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff7ed,#ffffff)] px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="mt-2 text-3xl font-bold text-slate-900">{summary.destination}</h3>
            </div>
            <div className="rounded-[24px] bg-amber-50 px-5 py-4 text-right">
              <div className="flex items-center justify-end gap-2 text-amber-500">
                <Star size={18} fill="currentColor" />
                <strong className="text-3xl text-slate-900">{summary.averageRating}</strong>
                <span className="text-sm text-slate-500">/ 5</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{summary.total} reviews</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            {["Pokhara", "Kathmandu", "Chitwan", "Mustang", "Lumbini"].map((item) => (
              <button key={item} type="button" onClick={() => loadReviews(item)} className={`rounded-full px-3 py-2 text-sm font-semibold ${destination === item ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-700"}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="grid gap-4">
            {summary.reviews.map((review) => (
              <article key={review._id} className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{review.userId?.name || "Traveler"}</p>
                    <p className="text-sm text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                    {isMine(review) ? (
                      <p className="mt-1 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        Status: {review.status || "approved"}
                      </p>
                    ) : null}
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-600">
                    <Star size={14} fill="currentColor" />
                    {review.rating}
                  </div>
                </div>
                {editingId === review._id ? (
                  <div className="mt-4 grid gap-3 rounded-[22px] border border-slate-200 bg-white p-4">
                    <input value={editForm.destination} onChange={(e) => setEditForm((c) => ({ ...c, destination: e.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                    <select value={editForm.rating} onChange={(e) => setEditForm((c) => ({ ...c, rating: e.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none">
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                    <textarea value={editForm.reviewText} onChange={(e) => setEditForm((c) => ({ ...c, reviewText: e.target.value }))} rows={3} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none" />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => saveEdit(review._id)} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">Save changes</button>
                      <button type="button" onClick={cancelEdit} className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{review.reviewText}</p>
                    {isMine(review) ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEdit(review)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteReview(review._id)} className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </article>
            ))}

            {summary.reviews.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                No reviews yet for this destination.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
