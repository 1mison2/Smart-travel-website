import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, MapPinned } from "lucide-react";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";

const initialState = {
  destination: "",
  startDate: "",
  endDate: "",
  budget: "",
  travelStyle: "solo",
  interests: "",
  description: "",
};

export default function CreateTripPlan() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      await api.post("/api/travel-plans/create", {
        ...form,
        budget: Number(form.budget),
        interests: form.interests.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setMessage("Travel plan created successfully.");
      setForm(initialState);
      navigate("/buddy/browse");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create travel plan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TravelSocialShell
      theme="buddy"
      badge="Travel Buddy Finder"
      icon={Compass}
      title="Create a trip that attracts the right kind of travel partner."
      stats={[
        { label: "Trip fields", value: "6+" },
        { label: "Match factors", value: "4" },
        { label: "Plan status", value: "Live" },
      ]}
      actions={[
        { label: "Browse trips", to: "/buddy/browse", variant: "ghost" },
        { label: "See matches", to: "/buddy/matches" },
      ]}
    >
      <div className="grid gap-6">
        <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">New Travel Plan</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Trip details</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Write a plan that tells other travelers exactly what kind of journey you want to share.
              </p>
            </div>
            <span className="rounded-2xl bg-sky-50 p-3 text-sky-700">
              <MapPinned size={22} />
            </span>
          </div>

          <form onSubmit={onSubmit} className="mt-7 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Destination</span>
              <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" placeholder="Pokhara" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Budget</span>
              <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" type="number" placeholder="Budget (NPR)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Start date</span>
              <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">End date</span>
              <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Travel style</span>
              <select className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" value={form.travelStyle} onChange={(e) => setForm({ ...form, travelStyle: e.target.value })}>
                <option value="solo">Solo</option>
                <option value="group">Group</option>
                <option value="adventure">Adventure</option>
                <option value="luxury">Luxury</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Interests</span>
              <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" placeholder="hiking, food, culture" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Trip description</span>
              <textarea className="min-h-40 rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" placeholder="Describe your pace, expectations, and what kind of buddy experience you want." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <button disabled={submitting} className="rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-3.5 font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 md:col-span-2">
              {submitting ? "Creating..." : "Create travel plan"}
            </button>
          </form>

          {message && <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p>}
          {error && <p className="mt-4 text-sm font-medium text-rose-700">{error}</p>}
        </section>
      </div>
    </TravelSocialShell>
  );
}
