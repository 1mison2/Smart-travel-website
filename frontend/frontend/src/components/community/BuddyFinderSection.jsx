import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  Compass,
  HeartHandshake,
  Languages,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import SectionSkeleton from "./SectionSkeleton";
import {
  buildIntroMessage,
  formatTravelWindow,
  getBudgetBand,
  getCautionNote,
  getMatchScore,
  getMatchTone,
  getProfileCompleteness,
  getSharedSignals,
  getTrustBadges,
} from "../../utils/buddyInsights";

const initialFilters = {
  destination: "",
  startDate: "",
  endDate: "",
  interests: "",
  minBudget: "",
  maxBudget: "",
  travelStyle: "",
};

const quickFilters = [
  { label: "Adventure", field: "interests", value: "adventure" },
  { label: "Culture", field: "interests", value: "culture" },
  { label: "Slow travel", field: "travelStyle", value: "slow travel" },
  { label: "Road trip", field: "travelStyle", value: "road trip" },
];

const scoreBadgeClass = (accent) => {
  if (accent === "emerald") return "bg-emerald-50 text-emerald-700";
  if (accent === "sky") return "bg-sky-50 text-sky-700";
  if (accent === "amber") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

export default function BuddyFinderSection({ onNotify }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [matches, setMatches] = useState([]);
  const [myPlans, setMyPlans] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [buddyRequests, setBuddyRequests] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [sortBy, setSortBy] = useState("compatibility");
  const [sourcePlan, setSourcePlan] = useState(null);
  const [requestDrafts, setRequestDrafts] = useState({});
  const [expandedMatchId, setExpandedMatchId] = useState("");

  const suggestionList = useMemo(
    () =>
      suggestions
        .filter((item) =>
          item.toLowerCase().includes(filters.destination.toLowerCase())
        )
        .slice(0, 6),
    [filters.destination, suggestions]
  );

  const sortedMatches = useMemo(() => {
    const next = [...matches];
    if (sortBy === "overlap") {
      return next.sort(
        (a, b) =>
          (b.overlappingDays || 0) - (a.overlappingDays || 0) ||
          getMatchScore(b) - getMatchScore(a)
      );
    }
    if (sortBy === "budget") {
      return next.sort(
        (a, b) =>
          Number(a?.travelPlan?.budget || 0) - Number(b?.travelPlan?.budget || 0)
      );
    }
    return next.sort((a, b) => getMatchScore(b) - getMatchScore(a));
  }, [matches, sortBy]);

  const strongMatches = useMemo(
    () => sortedMatches.filter((match) => getMatchScore(match) >= 70).length,
    [sortedMatches]
  );

  const requestLookup = useMemo(() => {
    const lookup = new Map();
    buddyRequests.forEach((request) => {
      const travelPlanId = String(
        request?.travelPlanId?._id || request?.travelPlanId || ""
      );
      const counterpartId = String(
        request?.senderId?._id === user?._id || request?.senderId?._id === user?.id
          ? request?.receiverId?._id
          : request?.senderId?._id
      );
      if (!travelPlanId || !counterpartId) return;
      lookup.set(`${travelPlanId}:${counterpartId}`, request);
    });
    return lookup;
  }, [buddyRequests, user]);

  const chatRoomLookup = useMemo(() => {
    const lookup = new Map();
    chatRooms.forEach((room) => {
      const requestId = String(room?.buddyRequestId?._id || room?.buddyRequestId || "");
      if (!requestId) return;
      lookup.set(requestId, room);
    });
    return lookup;
  }, [chatRooms]);

  const pendingRequestsCount = useMemo(
    () => buddyRequests.filter((request) => request?.status === "pending").length,
    [buddyRequests]
  );

  const activeChatCount = chatRooms.length;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const loadBuddyState = async () => {
    try {
      const { data } = await api.get("/api/buddy/requests");
      setBuddyRequests(Array.isArray(data?.buddyRequests) ? data.buddyRequests : []);
      setChatRooms(Array.isArray(data?.chatRooms) ? data.chatRooms : []);
    } catch {
      // non-blocking
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [plansRes, myPlansRes, buddyState] = await Promise.all([
        api.get("/api/trips"),
        api.get("/api/trips", { params: { mine: true } }),
        api.get("/api/buddy/requests").catch(() => ({ data: {} })),
      ]);
      const allPlans = plansRes.data?.travelPlans || [];
      const ownPlans = myPlansRes.data?.travelPlans || [];
      setSuggestions(
        Array.from(new Set(allPlans.map((item) => item.destination).filter(Boolean)))
      );
      setMyPlans(ownPlans);
      setBuddyRequests(
        Array.isArray(buddyState?.data?.buddyRequests)
          ? buddyState.data.buddyRequests
          : []
      );
      setChatRooms(
        Array.isArray(buddyState?.data?.chatRooms) ? buddyState.data.chatRooms : []
      );
    } catch {
      onNotify?.({ type: "error", message: "Failed to load buddy finder." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const buildDraftMap = (basePlan, nextMatches) =>
    (Array.isArray(nextMatches) ? nextMatches : []).reduce((acc, match) => {
      const matchId = match?.travelPlan?._id;
      if (!matchId) return acc;
      acc[matchId] = buildIntroMessage(basePlan, match);
      return acc;
    }, {});

  const runPlanMatch = async (planId, notifyOnEmpty = true) => {
    if (!planId) return;
    try {
      setSearching(true);
      const { data } = await api.get(`/api/buddy/match/${planId}`);
      const source = data?.sourcePlan || null;
      const nextMatches = data?.matches || [];
      setSelectedPlanId(planId);
      setSourcePlan(source);
      setMatches(nextMatches);
      setExpandedMatchId(nextMatches[0]?.travelPlan?._id || "");
      setRequestDrafts(buildDraftMap(source, nextMatches));
      if (source) {
        setFilters({
          destination: source.destination || "",
          startDate: source.startDate ? String(source.startDate).slice(0, 10) : "",
          endDate: source.endDate ? String(source.endDate).slice(0, 10) : "",
          interests: Array.isArray(source.interests) ? source.interests.join(", ") : "",
          minBudget: source.budget ? String(Math.max(0, Number(source.budget) - 5000)) : "",
          maxBudget: source.budget ? String(Number(source.budget) + 5000) : "",
          travelStyle: source.travelStyle || "",
        });
      }
      if (notifyOnEmpty && nextMatches.length === 0) {
        onNotify?.({
          type: "info",
          message: "No trip-overlap matches found for that plan yet.",
        });
      }
    } catch (err) {
      onNotify?.({
        type: "error",
        message:
          err?.response?.data?.message ||
          "Unable to match from this travel plan.",
      });
    } finally {
      setSearching(false);
    }
  };

  const searchMatches = async () => {
    try {
      setSearching(true);
      const basePlan = {
        destination: filters.destination,
        startDate: filters.startDate,
        endDate: filters.endDate,
        budget: filters.maxBudget || filters.minBudget || "",
        travelStyle: filters.travelStyle,
        interests: String(filters.interests || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
      const { data } = await api.get("/api/buddy/search", {
        params: { ...filters, interests: filters.interests },
      });
      const nextMatches = data?.matches || [];
      setSourcePlan(basePlan);
      setMatches(nextMatches);
      setExpandedMatchId(nextMatches[0]?.travelPlan?._id || "");
      setRequestDrafts(buildDraftMap(basePlan, nextMatches));
      if (nextMatches.length === 0) {
        onNotify?.({
          type: "info",
          message: "No strong matches found for the current filters.",
        });
      }
    } catch {
      onNotify?.({ type: "error", message: "Unable to search buddies right now." });
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setFilters(initialFilters);
    setSelectedPlanId("");
    setSourcePlan(null);
    setMatches([]);
    setRequestDrafts({});
    setExpandedMatchId("");
  };

  const sendBuddyRequest = async (match) => {
    try {
      const requestId = match.travelPlan?._id || "";
      setSendingId(requestId);
      const senderPlanId =
        myPlans.find(
          (plan) =>
            plan.destination?.toLowerCase() ===
            match.travelPlan?.destination?.toLowerCase()
        )?._id ||
        myPlans[0]?._id ||
        null;

      await api.post("/api/buddy/request", {
        receiverId: match.traveler?._id,
        travelPlanId: match.travelPlan?._id,
        senderPlanId,
        introMessage: requestDrafts[requestId] || "",
      });
      await loadBuddyState();
      onNotify?.({
        type: "success",
        message: `Buddy request sent to ${match.traveler?.name || "traveler"}.`,
      });
    } catch (err) {
      onNotify?.({
        type: "error",
        message: err?.response?.data?.message || "Failed to send buddy request.",
      });
    } finally {
      setSendingId("");
    }
  };

  const applyQuickFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  if (loading) return <SectionSkeleton cards={3} />;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#082f49,#0ea5e9_62%,#22c55e)] px-6 py-5 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Travel Buddy Finder
              </p>
              <h3 className="mt-2 text-2xl font-bold">Match with travelers who already fit your trip</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-[22px] bg-white/12 px-4 py-3 backdrop-blur">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Strong matches
                </span>
                <strong className="mt-1 block text-xl">{strongMatches}</strong>
              </div>
              <div className="rounded-[22px] bg-white/12 px-4 py-3 backdrop-blur">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Total matches
                </span>
                <strong className="mt-1 block text-xl">{matches.length}</strong>
              </div>
              <div className="rounded-[22px] bg-white/12 px-4 py-3 backdrop-blur">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Pending requests
                </span>
                <strong className="mt-1 block text-xl">{pendingRequestsCount}</strong>
              </div>
              <div className="rounded-[22px] bg-white/12 px-4 py-3 backdrop-blur">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Chats ready
                </span>
                <strong className="mt-1 block text-xl">{activeChatCount}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-xl font-bold text-slate-900">Search and refine</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Start from one of your plans or build a custom filter set.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeFilterCount ? (
                  <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                    {activeFilterCount} active filters
                  </span>
                ) : null}
                <button type="button" onClick={clearSearch} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700">
                  Clear
                </button>
                <button
                  type="button"
                  onClick={searchMatches}
                  disabled={searching}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search size={16} />
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {quickFilters.map((item) => (
                <button
                  key={`${item.field}-${item.value}`}
                  type="button"
                  onClick={() => applyQuickFilter(item.field, item.value)}
                  className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <Compass size={14} />
                  Match from my plan
                </span>
                <div className="flex flex-col gap-3 md:flex-row">
                  <select
                    value={selectedPlanId}
                    onChange={(event) => setSelectedPlanId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                  >
                    <option value="">Choose one of your travel plans</option>
                    {myPlans.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.destination} - {String(plan.startDate || "").slice(0, 10)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => runPlanMatch(selectedPlanId)}
                    disabled={!selectedPlanId || searching}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles size={16} />
                    Match this trip
                  </button>
                </div>
              </label>

              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <MapPin size={14} />
                  Destination
                </span>
                <input
                  value={filters.destination}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      destination: event.target.value,
                    }))
                  }
                  placeholder="Pokhara, ABC, Mustang..."
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <CalendarDays size={14} />
                  Start date
                </span>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <CalendarDays size={14} />
                  End date
                </span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Interests
                </span>
                <input
                  value={filters.interests}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      interests: event.target.value,
                    }))
                  }
                  placeholder="culture, trekking, food"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Max budget
                </span>
                <input
                  value={filters.maxBudget}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      maxBudget: event.target.value,
                    }))
                  }
                  placeholder="30000"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Travel style
                </span>
                <input
                  value={filters.travelStyle}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      travelStyle: event.target.value,
                    }))
                  }
                  placeholder="Backpacking, slow travel, road trip"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-500">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="compatibility">Best compatibility</option>
                  <option value="overlap">Most date overlap</option>
                  <option value="budget">Lowest budget first</option>
                </select>
              </label>

              {suggestionList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestionList.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({ ...current, destination: item }))
                      }
                      className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {sourcePlan ? (
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Matching baseline
                    </p>
                    <h5 className="mt-1 text-lg font-bold text-slate-900">
                      {sourcePlan.title || sourcePlan.destination || "Search mode"}
                    </h5>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {formatTravelWindow(sourcePlan)}
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {getBudgetBand(sourcePlan.budget)}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {strongMatches} strong
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-5">
        {sortedMatches.length ? (
          sortedMatches.map((match) => {
            const score = getMatchScore(match);
            const tone = getMatchTone(score);
            const trustBadges = getTrustBadges(match.traveler, match.travelPlan);
            const completeness = getProfileCompleteness(
              match.traveler,
              match.travelPlan
            );
            const caution = getCautionNote(sourcePlan, match.travelPlan, match);
            const draftKey = match.travelPlan?._id || "";
            const requestKey = `${String(match.travelPlan?._id || "")}:${String(
              match.traveler?._id || ""
            )}`;
            const existingRequest = requestLookup.get(requestKey) || null;
            const linkedChatRoom = existingRequest
              ? chatRoomLookup.get(String(existingRequest._id))
              : null;
            const isPending = existingRequest?.status === "pending";
            const isAccepted = existingRequest?.status === "accepted";
            const sharedSignals = getSharedSignals(match);
            const isExpanded = expandedMatchId === draftKey;

            return (
              <article
                key={draftKey}
                className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                      <img
                        src={
                          match.traveler?.profilePicture ||
                          "https://placehold.co/96x96/e2e8f0/475569?text=TR"
                        }
                        alt={match.traveler?.name || "Traveler"}
                        className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {tone.label}
                          </p>
                          {existingRequest ? (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                              isAccepted
                                ? "bg-emerald-100 text-emerald-700"
                                : isPending
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-200 text-slate-700"
                            }`}>
                              {existingRequest.status}
                            </span>
                          ) : null}
                        </div>
                        <h4 className="mt-1 text-xl font-bold text-slate-900">
                          {match.traveler?.name || "Traveler"}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {match.travelPlan?.destination} •{" "}
                          {formatTravelWindow(match.travelPlan)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {trustBadges.map((badge) => (
                            <span
                              key={badge}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-start gap-3">
                      <div className={`rounded-[22px] px-4 py-3 text-right ${scoreBadgeClass(tone.accent)}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                          Compatibility
                        </p>
                        <strong className="text-2xl font-bold">{score}%</strong>
                      </div>
                      <div className="rounded-[22px] bg-slate-50 px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Shared signals
                        </p>
                        <strong className="text-2xl font-bold text-slate-900">
                          {sharedSignals.length}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-5 xl:grid-cols-[1.05fr,0.95fr]">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Profile ready
                        </p>
                        <p className="mt-2 text-xl font-bold text-slate-900">
                          {completeness}%
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Date overlap
                        </p>
                        <p className="mt-2 text-xl font-bold text-slate-900">
                          {match.overlappingDays || 0} day
                          {match.overlappingDays === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Budget lane
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          {getBudgetBand(match.travelPlan?.budget)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <ShieldCheck size={16} />
                        <p className="text-sm font-semibold">Quick fit summary</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {sharedSignals.map((signal) => (
                          <span
                            key={signal}
                            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
                          >
                            {signal}
                          </span>
                        ))}
                        {sharedSignals.length === 0 ? (
                          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                            Similar destination timing
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMatchId((current) =>
                          current === draftKey ? "" : draftKey
                        )
                      }
                      className="flex w-full items-center justify-between rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span>
                        <strong className="block text-sm text-slate-900">
                          Why this match?
                        </strong>
                        <small className="text-slate-500">
                          See fit signals, caution notes, and travel details
                        </small>
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-slate-500 transition ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded ? (
                      <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm leading-7 text-slate-600">
                          {match.travelPlan?.description ||
                            match.traveler?.bio ||
                            "Travel partner looking for similar experiences with enough structure to make planning realistic."}
                        </p>

                        <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-4">
                          <div className="flex items-center gap-2 text-amber-700">
                            <TriangleAlert size={16} />
                            <p className="text-sm font-semibold">Possible mismatch</p>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-amber-900/85">
                            {caution}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[28px] bg-slate-50 p-5 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h5 className="text-lg font-bold text-slate-900">
                        Reach out with context
                      </h5>
                      {(match.traveler?.languages || []).length ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          <Languages size={14} />
                          {(match.traveler.languages || []).slice(0, 2).join(", ")}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Destination
                        </span>
                        <strong className="mt-1 block text-slate-900">
                          {match.travelPlan?.destination || "Not set"}
                        </strong>
                      </div>
                      <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Travel window
                        </span>
                        <strong className="mt-1 block text-slate-900">
                          {formatTravelWindow(match.travelPlan)}
                        </strong>
                      </div>
                    </div>

                    <textarea
                      value={requestDrafts[draftKey] || ""}
                      onChange={(event) =>
                        setRequestDrafts((current) => ({
                          ...current,
                          [draftKey]: event.target.value,
                        }))
                      }
                      rows={5}
                      disabled={isPending || isAccepted}
                      className="mt-4 w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                    />

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => sendBuddyRequest(match)}
                        disabled={sendingId === draftKey || isPending || isAccepted}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <HeartHandshake size={16} />
                        {isPending
                          ? "Request Pending"
                          : isAccepted
                            ? "Request Accepted"
                            : sendingId === draftKey
                              ? "Sending..."
                              : "Send Buddy Request"}
                      </button>

                      {isAccepted && linkedChatRoom ? (
                        <Link
                          to={`/buddy/chat/${linkedChatRoom._id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700"
                        >
                          <Languages size={16} />
                          Open Chat
                        </Link>
                      ) : null}

                      <Link
                        to="/buddy/requests"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                      >
                        <Users size={16} />
                        View Requests
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            <Compass className="mx-auto mb-3 text-sky-400" size={28} />
            <p className="text-base font-semibold text-slate-700">No matches yet</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
              {sourcePlan ||
              filters.destination ||
              filters.startDate ||
              filters.endDate ||
              filters.maxBudget ||
              filters.travelStyle
                ? "Try widening the destination, shifting the dates a little, or loosening the budget to reveal more travelers."
                : "Start with one of your own plans or use a few quick filters to discover compatible travel buddies."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
