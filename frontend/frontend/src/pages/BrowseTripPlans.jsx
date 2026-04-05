import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Filter, Sparkles } from "lucide-react";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";

export default function BrowseTripPlans() {
  const [filters, setFilters] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    minBudget: "",
    maxBudget: "",
    interests: "",
    mine: false,
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPlans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (typeof value === "boolean") {
          if (value) params.set(key, "true");
          return;
        }
        if (value) params.set(key, value);
      });
      const { data } = await api.get(`/api/travel-plans?${params.toString()}`);
      setPlans(Array.isArray(data?.travelPlans) ? data.travelPlans : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load travel plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  return (
    <TravelSocialShell
      theme="buddy"
      badge="Browse Trips"
      icon={Compass}
      title="Scan active travel plans and spot journeys that line up with yours."
      stats={[
        { label: "Visible plans", value: plans.length },
        { label: "Search mode", value: filters.mine ? "Mine" : "All" },
        { label: "Status", value: loading ? "Loading" : "Ready" },
      ]}
      actions={[
        { label: "Create trip", to: "/buddy/create-trip", variant: "ghost" },
        { label: "Refresh plans", onClick: loadPlans },
      ]}
    >
      <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="rounded-[28px] bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <Filter size={20} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Filter travel plans</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" placeholder="Destination" value={filters.destination} onChange={(e) => setFilters({ ...filters, destination: e.target.value })} />
              <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
              <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
              <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" type="number" placeholder="Min budget" value={filters.minBudget} onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })} />
              <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" type="number" placeholder="Max budget" value={filters.maxBudget} onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })} />
              <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" placeholder="Interests" value={filters.interests} onChange={(e) => setFilters({ ...filters, interests: e.target.value })} />
            </div>
            <label className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
              <input type="checkbox" checked={filters.mine} onChange={(e) => setFilters({ ...filters, mine: e.target.checked })} />
              <span>Show only my travel plans</span>
            </label>
            <button onClick={loadPlans} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-slate-900 to-sky-700 px-4 py-3.5 font-semibold text-white transition hover:-translate-y-0.5">
              Search plans
            </button>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Results</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Travelers heading your way</h2>
              </div>
              <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                {plans.length} plan{plans.length === 1 ? "" : "s"}
              </span>
            </div>

            {error && <p className="mb-4 text-sm font-medium text-rose-700">{error}</p>}
            {loading ? (
              <p className="text-slate-600">Loading travel plans...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {plans.map((plan) => (
                  <article key={plan._id} className="rounded-[30px] bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 transition hover:-translate-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{plan.travelStyle || "travel plan"}</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-900">{plan.destination}</h3>
                        <p className="mt-1 text-sm text-slate-500">{plan.userId?.name || "Traveler"}</p>
                      </div>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">NPR {plan.budget}</span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{plan.description || "No extra description yet."}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(plan.interests || []).map((interest) => (
                        <span key={interest} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                          {interest}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}</span>
                      <Link to={`/buddy/matches?travelPlanId=${plan._id}`} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white">
                        <Sparkles size={14} />
                        See matches
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </TravelSocialShell>
  );
}
