import React, { useEffect, useState } from "react";
import { CalendarRange, HeartHandshake, MapPinned, NotebookPen, Wallet } from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import SectionSkeleton from "./SectionSkeleton";

const emptyTripForm = {
  title: "",
  destination: "",
  startDate: "",
  endDate: "",
  budget: "",
  interests: "",
  description: "",
  travelStyle: "",
};

export default function TripPostsSection({ onNotify }) {
  const { user } = useAuth();
  const [tripPosts, setTripPosts] = useState([]);
  const [myPlans, setMyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [form, setForm] = useState(emptyTripForm);

  const loadTripPosts = async () => {
    try {
      setLoading(true);
      const [postsRes, mineRes] = await Promise.all([
        api.get("/api/trips"),
        api.get("/api/trips", { params: { mine: true } }),
      ]);
      setTripPosts(postsRes.data?.travelPlans || []);
      setMyPlans(mineRes.data?.travelPlans || []);
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load trip posts." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripPosts();
  }, []);

  const createTripPost = async (event) => {
    event.preventDefault();
    try {
      setCreating(true);
      await api.post("/api/trips/create", { ...form, interests: form.interests });
      setForm(emptyTripForm);
      onNotify?.({ type: "success", message: "Trip post created successfully." });
      await loadTripPosts();
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Failed to create trip post." });
    } finally {
      setCreating(false);
    }
  };

  const sendBuddyRequest = async (plan) => {
    try {
      setSendingId(plan._id);
      const senderPlanId =
        myPlans.find((item) => item.destination?.toLowerCase() === plan.destination?.toLowerCase())?._id || myPlans[0]?._id || null;

      await api.post("/api/buddy/request", {
        receiverId: plan.userId?._id,
        travelPlanId: plan._id,
        senderPlanId,
      });
      onNotify?.({ type: "success", message: `Buddy request sent to ${plan.userId?.name || "traveler"}.` });
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Unable to send buddy request." });
    } finally {
      setSendingId("");
    }
  };

  if (loading) return <SectionSkeleton cards={2} />;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#0f766e_55%,#22c55e)] px-6 py-6 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-emerald-100">Trip Posts</p>
          <h3 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">Create a trip and let the right travelers find it</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50/90">
            Publish destination, dates, budget, and expectations so your trip reads like a real plan, not just a notice.
          </p>
        </div>

        <div className="grid gap-6 p-6">
          <form onSubmit={createTripPost} className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">New Trip Post</p>
              <h4 className="mt-2 text-xl font-bold text-slate-900">Trip details</h4>
            </div>
            <input value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="Trip title" className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none" />
            <input value={form.destination} onChange={(e) => setForm((c) => ({ ...c, destination: e.target.value }))} placeholder="Destination" className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none" />
            <input type="date" value={form.startDate} onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none" />
            <input type="date" value={form.endDate} onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none" />
            <input value={form.budget} onChange={(e) => setForm((c) => ({ ...c, budget: e.target.value }))} placeholder="Budget in NPR" className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none" />
            <input value={form.interests} onChange={(e) => setForm((c) => ({ ...c, interests: e.target.value }))} placeholder="Interests: hiking, food, culture" className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none" />
            <input value={form.travelStyle} onChange={(e) => setForm((c) => ({ ...c, travelStyle: e.target.value }))} placeholder="Travel style" className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none lg:col-span-2" />
            <textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Describe the trip, pace, expectations, and the kind of buddy you want." rows={4} className="rounded-[24px] border border-slate-200 bg-white px-4 py-3.5 outline-none lg:col-span-2" />
            <div className="lg:col-span-2">
              <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                <NotebookPen size={16} />
                {creating ? "Publishing..." : "Publish Trip"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {tripPosts.map((plan) => (
          <article key={plan._id} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="bg-[linear-gradient(135deg,#0ea5e9,#22c55e)] p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-100">Trip Post</p>
              <h4 className="mt-3 text-2xl font-bold">{plan.title || plan.destination}</h4>
              <p className="mt-2 max-w-xl text-sm leading-7 text-sky-50">{plan.description || "Looking for compatible travel buddies."}</p>
            </div>
            <div className="p-5">
              <div className="grid gap-3 rounded-[24px] bg-slate-50 p-4 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-slate-600"><MapPinned size={16} className="text-sky-500" />{plan.destination}</div>
                <div className="flex items-center gap-2 text-sm text-slate-600"><CalendarRange size={16} className="text-sky-500" />{new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}</div>
                <div className="flex items-center gap-2 text-sm text-slate-600"><Wallet size={16} className="text-sky-500" />NPR {Number(plan.budget || 0).toLocaleString()}</div>
                <div className="text-sm text-slate-600">By {plan.userId?.name || "Traveler"}</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(plan.interests || []).map((interest) => (
                  <span key={interest} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{interest}</span>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => sendBuddyRequest(plan)}
                  disabled={sendingId === plan._id || String(plan.userId?._id) === String(user?._id)}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  <HeartHandshake size={16} />
                  {sendingId === plan._id ? "Sending..." : "Send Buddy Request"}
                </button>
              </div>
            </div>
          </article>
        ))}

        {tripPosts.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 xl:col-span-2">
            No trip posts yet. Create the first trip and start finding travel buddies.
          </div>
        ) : null}
      </div>
    </div>
  );
}
