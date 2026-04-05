import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import SectionSkeleton from "./SectionSkeleton";

export default function DestinationReviewsSection({ onNotify }) {
  const [destination, setDestination] = useState("Pokhara");
  const [summary, setSummary] = useState({ destination: "Pokhara", averageRating: 0, total: 0, reviews: [] });
  const [loading, setLoading] = useState(true);

  const loadReviews = async (target = destination) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/reviews/${encodeURIComponent(target)}`);
      setSummary({
        destination: data?.destination || target,
        averageRating: data?.averageRating || 0,
        total: data?.total || 0,
        reviews: data?.reviews || [],
      });
      setDestination(target);
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load destination reviews." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews("Pokhara");
  }, []);

  if (loading) return <SectionSkeleton cards={2} />;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff7ed,#ffffff)] px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-slate-400">Destination Reviews</p>
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

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Reviews can be written on each location page.</p>
            <Link to="/explore" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Open locations
            </Link>
          </div>

          <div className="grid gap-4">
            {summary.reviews.map((review) => (
              <article key={review._id} className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{review.userId?.name || "Traveler"}</p>
                    <p className="text-sm text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-600">
                    <Star size={14} fill="currentColor" />
                    {review.rating}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{review.reviewText}</p>
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
