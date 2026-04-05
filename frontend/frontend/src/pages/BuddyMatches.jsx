import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, HeartHandshake, Sparkles } from "lucide-react";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";

export default function BuddyMatches() {
  const [searchParams] = useSearchParams();
  const [travelPlans, setTravelPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(searchParams.get("travelPlanId") || "");
  const [matches, setMatches] = useState([]);
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
        const { data } = await api.get(`/api/buddy/match/${selectedPlanId}`);
        setMatches(Array.isArray(data?.matches) ? data.matches : []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load matches");
      }
    };
    loadMatches();
  }, [selectedPlanId]);

  const sendRequest = async (match) => {
    try {
      await api.post("/api/buddy/request", {
        receiverId: match.traveler?._id,
        travelPlanId: match.travelPlan?._id,
        senderPlanId: selectedPlanId,
      });
      setMessage(`Buddy request sent to ${match.traveler?.name || "traveler"}.`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send buddy request");
    }
  };

  return (
    <TravelSocialShell
      theme="buddy"
      badge="Suggested Buddies"
      icon={Sparkles}
      title="Review ranked travel matches before you send a request."
      stats={[
        { label: "My plans", value: travelPlans.length },
        { label: "Matches", value: matches.length },
        { label: "Selected", value: selectedPlanId ? "1" : "0" },
      ]}
      actions={[
        { label: "Create new trip", to: "/buddy/create-trip", variant: "ghost" },
        { label: "Open requests", to: "/buddy/requests" },
      ]}
    >
      <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
          <aside className="rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <Compass size={20} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Select your trip plan</h2>
              </div>
            </div>
            <select className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
              <option value="">Select your travel plan</option>
              {travelPlans.map((plan) => (
                <option key={plan._id} value={plan._id}>{plan.destination} ({new Date(plan.startDate).toLocaleDateString()})</option>
              ))}
            </select>
          </aside>

          <div>
            {message && <p className="mb-4 text-sm font-medium text-emerald-700">{message}</p>}
            {error && <p className="mb-4 text-sm font-medium text-rose-700">{error}</p>}

            <div className="grid gap-4 lg:grid-cols-2">
              {matches.map((match) => (
                <article key={match.travelPlan?._id} className="rounded-[30px] bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 transition hover:-translate-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{match.traveler?.name || "Traveler"}</h3>
                      <p className="text-sm text-slate-500">{match.travelPlan?.destination}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                      Match {match.matchScore}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{match.travelPlan?.description || match.traveler?.bio || "Travel partner looking for similar experiences."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(match.sharedInterests || []).map((interest) => (
                      <span key={interest} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        {interest}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-500">
                    {(match.reasons || []).map((reason) => <li key={reason}>• {reason}</li>)}
                  </ul>
                  <button onClick={() => sendRequest(match)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-100">
                    <HeartHandshake size={16} />
                    Send buddy request
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </TravelSocialShell>
  );
}
