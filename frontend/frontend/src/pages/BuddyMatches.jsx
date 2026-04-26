import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, HeartHandshake, Languages, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";
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
} from "../utils/buddyInsights";

export default function BuddyMatches() {
  const [searchParams] = useSearchParams();
  const [travelPlans, setTravelPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(searchParams.get("travelPlanId") || "");
  const [sourcePlan, setSourcePlan] = useState(null);
  const [matches, setMatches] = useState([]);
  const [requestDrafts, setRequestDrafts] = useState({});
  const [sendingId, setSendingId] = useState("");
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadMine = async () => {
      const { data } = await api.get("/api/travel-plans?mine=true");
      const myPlans = Array.isArray(data?.travelPlans) ? data.travelPlans : [];
      setTravelPlans(myPlans);
      if (!selectedPlanId && myPlans[0]?._id) setSelectedPlanId(myPlans[0]._id);
    };
    loadMine().catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPlanId) return;

    const loadMatches = async () => {
      try {
        setLoadingMatches(true);
        const { data } = await api.get(`/api/buddy/match/${selectedPlanId}`);
        const nextSourcePlan = data?.sourcePlan || null;
        const nextMatches = Array.isArray(data?.matches) ? data.matches : [];
        setSourcePlan(nextSourcePlan);
        setMatches(nextMatches);
        setRequestDrafts(
          nextMatches.reduce((acc, match) => {
            const matchId = match?.travelPlan?._id;
            if (!matchId) return acc;
            acc[matchId] = buildIntroMessage(nextSourcePlan, match);
            return acc;
          }, {})
        );
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load matches");
      } finally {
        setLoadingMatches(false);
      }
    };

    loadMatches();
  }, [selectedPlanId]);

  const summary = useMemo(() => {
    const highFit = matches.filter((match) => getMatchScore(match) >= 75).length;
    const overlapReady = matches.filter((match) => Number(match?.overlappingDays || 0) >= 2).length;
    return {
      highFit,
      overlapReady,
      avg: matches.length
        ? Math.round(matches.reduce((sum, match) => sum + getMatchScore(match), 0) / matches.length)
        : 0,
    };
  }, [matches]);

  const sendRequest = async (match) => {
    const requestId = match?.travelPlan?._id || "";
    try {
      setSendingId(requestId);
      await api.post("/api/buddy/request", {
        receiverId: match.traveler?._id,
        travelPlanId: requestId,
        senderPlanId: selectedPlanId,
        introMessage: requestDrafts[requestId] || "",
      });
      setMessage(`Buddy request sent to ${match.traveler?.name || "traveler"}.`);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send buddy request");
    } finally {
      setSendingId("");
    }
  };

  const selectedPlan = travelPlans.find((plan) => plan._id === selectedPlanId) || sourcePlan;

  return (
    <TravelSocialShell
      theme="buddy"
      badge="Suggested Buddies"
      icon={Sparkles}
      title="Review ranked travel matches with clearer trust, fit, and caution signals."
      description="This version helps you judge not only who matches your route, but who feels credible, compatible, and worth starting a real travel conversation with."
      stats={[
        { label: "My plans", value: travelPlans.length },
        { label: "Strong fits", value: summary.highFit },
        { label: "Avg match", value: summary.avg ? `${summary.avg}%` : "--" },
      ]}
      actions={[
        { label: "Create new trip", to: "/buddy/create-trip", variant: "ghost" },
        { label: "Open requests", to: "/buddy/requests" },
      ]}
    >
      <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
          <aside className="space-y-5">
            <div className="rounded-[30px] bg-[linear-gradient(135deg,#082f49,#0ea5e9_60%,#22c55e)] p-6 text-white shadow-[0_18px_50px_rgba(14,165,233,0.2)]">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-white/12 p-3">
                  <Compass size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-100">Source Plan</p>
                  <h2 className="mt-1 text-2xl font-bold">Choose the trip you want to match from</h2>
                </div>
              </div>
              <select
                className="mt-5 w-full rounded-[20px] border border-white/15 bg-white/10 px-4 py-3.5 text-sm text-white outline-none backdrop-blur"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                <option value="" style={{ color: "#0f172a" }}>Select your travel plan</option>
                {travelPlans.map((plan) => (
                  <option key={plan._id} value={plan._id} style={{ color: "#0f172a" }}>
                    {plan.destination} ({new Date(plan.startDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {selectedPlan ? (
              <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Matching From</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">{selectedPlan.title || selectedPlan.destination}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{selectedPlan.description || "This plan is now being used as the baseline for destination, date, and budget fit."}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-slate-200">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Travel window</span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{formatTravelWindow(selectedPlan)}</p>
                  </div>
                  <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-slate-200">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Budget posture</span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{getBudgetBand(selectedPlan.budget)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(selectedPlan.interests || []).slice(0, 5).map((interest) => (
                    <span key={interest} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">High trust</p>
                <p className="mt-2 text-2xl font-bold text-emerald-800">{summary.highFit}</p>
                <p className="mt-1 text-sm text-emerald-700/80">Matches likely worth a real intro</p>
              </div>
              <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Date overlap</p>
                <p className="mt-2 text-2xl font-bold text-sky-800">{summary.overlapReady}</p>
                <p className="mt-1 text-sm text-sky-700/80">Travelers with 2+ overlapping days</p>
              </div>
              <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Average fit</p>
                <p className="mt-2 text-2xl font-bold text-amber-800">{summary.avg ? `${summary.avg}%` : "--"}</p>
                <p className="mt-1 text-sm text-amber-700/80">Helps you judge shortlist quality fast</p>
              </div>
            </div>
          </aside>

          <div>
            {message && <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
            {error && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

            {loadingMatches ? (
              <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                Loading buddy matches...
              </div>
            ) : matches.length ? (
              <div className="grid gap-5">
                {matches.map((match) => {
                  const score = getMatchScore(match);
                  const tone = getMatchTone(score);
                  const trustBadges = getTrustBadges(match.traveler, match.travelPlan);
                  const completeness = getProfileCompleteness(match.traveler, match.travelPlan);
                  const matchId = match?.travelPlan?._id || "";
                  const signals = getSharedSignals(match);
                  const caution = getCautionNote(selectedPlan, match.travelPlan, match);
                  const languages = (match.traveler?.languages || []).slice(0, 2);

                  return (
                    <article key={matchId} className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <img
                              src={match.traveler?.profilePicture || "https://placehold.co/96x96/e2e8f0/475569?text=TR"}
                              alt={match.traveler?.name || "Traveler"}
                              className="h-16 w-16 rounded-[22px] object-cover ring-4 ring-white"
                            />
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{tone.label}</p>
                              <h3 className="mt-1 text-2xl font-bold text-slate-900">{match.traveler?.name || "Traveler"}</h3>
                              <p className="mt-1 text-sm text-slate-500">{match.travelPlan?.destination} • {formatTravelWindow(match.travelPlan)}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {trustBadges.map((badge) => (
                                  <span key={badge} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className={`rounded-[24px] px-4 py-4 text-right ${
                            tone.accent === "emerald" ? "bg-emerald-50 text-emerald-700" :
                            tone.accent === "sky" ? "bg-sky-50 text-sky-700" :
                            tone.accent === "amber" ? "bg-amber-50 text-amber-700" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Compatibility</p>
                            <strong className="mt-2 block text-3xl font-bold">{score}%</strong>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 p-6 xl:grid-cols-[1fr,0.92fr]">
                        <div className="space-y-5">
                          <p className="text-sm leading-7 text-slate-600">
                            {match.travelPlan?.description || match.traveler?.bio || "This traveler already has an active trip plan and looks open to a coordinated route, budget, and pace conversation."}
                          </p>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Profile ready</p>
                              <p className="mt-2 text-xl font-bold text-slate-900">{completeness}%</p>
                              <p className="mt-1 text-sm text-slate-500">Enough detail to judge fit faster</p>
                            </div>
                            <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Date overlap</p>
                              <p className="mt-2 text-xl font-bold text-slate-900">{match.overlappingDays || 0} day{match.overlappingDays === 1 ? "" : "s"}</p>
                              <p className="mt-1 text-sm text-slate-500">Enough time to make joint planning worthwhile</p>
                            </div>
                            <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Budget lane</p>
                              <p className="mt-2 text-xl font-bold text-slate-900">{getBudgetBand(match.travelPlan?.budget)}</p>
                              <p className="mt-1 text-sm text-slate-500">Quick clue on comfort expectations</p>
                            </div>
                          </div>

                          <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-4">
                            <div className="flex items-center gap-2 text-emerald-700">
                              <ShieldCheck size={16} />
                              <p className="text-sm font-semibold">Why this match looks promising</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {signals.map((signal) => (
                                <span key={signal} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                                  {signal}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[26px] border border-amber-100 bg-amber-50 p-4">
                            <div className="flex items-center gap-2 text-amber-700">
                              <TriangleAlert size={16} />
                              <p className="text-sm font-semibold">Conversation to have early</p>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-amber-900/85">{caution}</p>
                          </div>
                        </div>

                        <div className="rounded-[28px] bg-slate-50 p-5 ring-1 ring-slate-200">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Request Preview</p>
                              <h4 className="mt-2 text-xl font-bold text-slate-900">Start with a warmer intro</h4>
                            </div>
                            {languages.length ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                <Languages size={14} />
                                {languages.join(", ")}
                              </span>
                            ) : null}
                          </div>

                          <textarea
                            value={requestDrafts[matchId] || ""}
                            onChange={(event) =>
                              setRequestDrafts((current) => ({ ...current, [matchId]: event.target.value }))
                            }
                            rows={5}
                            className="mt-4 w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                            placeholder="Write a short intro before sending your request"
                          />

                          <div className="mt-4 grid gap-3">
                            <div className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-slate-200">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quick checklist</p>
                              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                <span>• Ask about timing and flexibility</span>
                                <span>• Align budget and stay comfort</span>
                                <span>• Confirm pace and expectations</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => sendRequest(match)}
                            disabled={sendingId === matchId}
                            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-sky-100"
                          >
                            <HeartHandshake size={16} />
                            {sendingId === matchId ? "Sending request..." : "Send buddy request"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                No strong buddy matches yet. Try another plan or broaden your trip timing.
              </div>
            )}
          </div>
        </div>
      </section>
    </TravelSocialShell>
  );
}
