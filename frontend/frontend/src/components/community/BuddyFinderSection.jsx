import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Compass, HeartHandshake, MapPin, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import api from "../../utils/api";
import SectionSkeleton from "./SectionSkeleton";

const initialFilters = {
  destination: "",
  startDate: "",
  endDate: "",
  interests: "",
  minBudget: "",
  maxBudget: "",
  travelStyle: "",
};

export default function BuddyFinderSection({ onNotify }) {
  const [filters, setFilters] = useState(initialFilters);
  const [matches, setMatches] = useState([]);
  const [myPlans, setMyPlans] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState("");

  const suggestionList = useMemo(
    () => suggestions.filter((item) => item.toLowerCase().includes(filters.destination.toLowerCase())).slice(0, 6),
    [filters.destination, suggestions]
  );

  const topMatch = matches[0];

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [plansRes, myPlansRes] = await Promise.all([
        api.get("/api/trips"),
        api.get("/api/trips", { params: { mine: true } }),
      ]);
      const allPlans = plansRes.data?.travelPlans || [];
      setSuggestions(Array.from(new Set(allPlans.map((item) => item.destination).filter(Boolean))));
      setMyPlans(myPlansRes.data?.travelPlans || []);
      const firstDestination = allPlans[0]?.destination || "";
      const params = firstDestination ? { destination: firstDestination } : {};
      const matchesRes = await api.get("/api/buddy/search", { params });
      setMatches(matchesRes.data?.matches || []);
      if (firstDestination) setFilters((current) => ({ ...current, destination: firstDestination }));
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load buddy finder." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const searchMatches = async () => {
    try {
      setSearching(true);
      const { data } = await api.get("/api/buddy/search", { params: { ...filters, interests: filters.interests } });
      setMatches(data?.matches || []);
      if ((data?.matches || []).length === 0) {
        onNotify?.({ type: "info", message: "No strong matches found for the current filters." });
      }
    } catch (_err) {
      onNotify?.({ type: "error", message: "Unable to search buddies right now." });
    } finally {
      setSearching(false);
    }
  };

  const sendBuddyRequest = async (match) => {
    try {
      setSendingId(match.travelPlan?._id || "");
      const senderPlanId =
        myPlans.find((plan) => plan.destination?.toLowerCase() === match.travelPlan?.destination?.toLowerCase())?._id ||
        myPlans[0]?._id ||
        null;

      await api.post("/api/buddy/request", {
        receiverId: match.traveler?._id,
        travelPlanId: match.travelPlan?._id,
        senderPlanId,
      });
      onNotify?.({ type: "success", message: `Buddy request sent to ${match.traveler?.name || "traveler"}.` });
    } catch (err) {
      onNotify?.({ type: "error", message: err?.response?.data?.message || "Failed to send buddy request." });
    } finally {
      setSendingId("");
    }
  };

  if (loading) return <SectionSkeleton cards={3} />;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 border-b border-slate-200 bg-[linear-gradient(135deg,#082f49,#0ea5e9_62%,#22c55e)] px-6 py-6 text-white lg:grid-cols-[1.1fr,0.9fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-sky-100">Find Travel Buddies</p>
            <h3 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">Smart matching for travelers with real trip overlap</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-50/90">
              Search by destination, dates, interests, budget, and travel style to surface the strongest travel companions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/80">Available matches</p>
              <p className="mt-2 text-2xl font-bold text-white">{matches.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/80">Your trip plans</p>
              <p className="mt-2 text-2xl font-bold text-white">{myPlans.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/80">Best compatibility</p>
              <p className="mt-2 text-2xl font-bold text-white">{topMatch ? `${topMatch.compatibility}%` : "--"}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Search Panel</p>
                <h4 className="mt-2 text-xl font-bold text-slate-900">Define the travel vibe</h4>
              </div>
              <button
                type="button"
                onClick={searchMatches}
                disabled={searching}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
              >
                <Search size={16} />
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <MapPin size={14} />
                  Destination
                </span>
                <input value={filters.destination} onChange={(event) => setFilters((current) => ({ ...current, destination: event.target.value }))} placeholder="Pokhara, ABC, Mustang..." className="w-full bg-transparent text-sm text-slate-900 outline-none" />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <SlidersHorizontal size={14} />
                  Interests
                </span>
                <input value={filters.interests} onChange={(event) => setFilters((current) => ({ ...current, interests: event.target.value }))} placeholder="hiking, food, photography" className="w-full bg-transparent text-sm text-slate-900 outline-none" />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <CalendarDays size={14} />
                  Start date
                </span>
                <input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} className="w-full bg-transparent text-sm text-slate-900 outline-none" />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <CalendarDays size={14} />
                  End date
                </span>
                <input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} className="w-full bg-transparent text-sm text-slate-900 outline-none" />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Min budget</span>
                <input value={filters.minBudget} onChange={(event) => setFilters((current) => ({ ...current, minBudget: event.target.value }))} placeholder="5000" className="w-full bg-transparent text-sm text-slate-900 outline-none" />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Max budget</span>
                <input value={filters.maxBudget} onChange={(event) => setFilters((current) => ({ ...current, maxBudget: event.target.value }))} placeholder="30000" className="w-full bg-transparent text-sm text-slate-900 outline-none" />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Travel style</span>
                <input value={filters.travelStyle} onChange={(event) => setFilters((current) => ({ ...current, travelStyle: event.target.value }))} placeholder="Backpacking, slow travel, road trip" className="w-full bg-transparent text-sm text-slate-900 outline-none" />
              </label>
            </div>

            {suggestionList.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestionList.map((item) => (
                  <button key={item} type="button" onClick={() => setFilters((current) => ({ ...current, destination: item }))} className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {matches.length ? (
          matches.map((match) => (
            <article key={match.travelPlan?._id} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={match.traveler?.profilePicture || "https://placehold.co/96x96/e2e8f0/475569?text=TR"} alt={match.traveler?.name || "Traveler"} className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white" />
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{match.traveler?.name || "Traveler"}</h4>
                      <p className="text-sm text-slate-500">{match.travelPlan?.destination}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(match.sharedInterests || match.travelPlan?.interests || []).slice(0, 3).map((interest) => (
                          <span key={interest} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{interest}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-emerald-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Compatibility</p>
                    <strong className="text-2xl font-bold text-emerald-700">{match.compatibility}%</strong>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid gap-3 rounded-[24px] bg-slate-50 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Destination</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{match.travelPlan?.destination}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Travel Style</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{match.travelPlan?.travelStyle || "Flexible"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Budget</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">NPR {Number(match.travelPlan?.budget || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(match.reasons || []).slice(0, 4).map((reason) => (
                    <span key={reason} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                      <Sparkles size={12} />
                      {reason}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => sendBuddyRequest(match)}
                    disabled={sendingId === match.travelPlan?._id}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <HeartHandshake size={16} />
                    {sendingId === match.travelPlan?._id ? "Sending..." : "Send Buddy Request"}
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 xl:col-span-2">
            <Compass className="mx-auto mb-3 text-sky-400" size={28} />
            No matched travelers yet. Try broadening the destination or date range.
          </div>
        )}
      </div>
    </div>
  );
}
