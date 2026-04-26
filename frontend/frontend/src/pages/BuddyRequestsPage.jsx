import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, MessageCircleHeart, MessageSquareText, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";
import { formatTravelWindow, getBudgetBand, getProfileCompleteness, getTrustBadges } from "../utils/buddyInsights";

const REQUEST_POLL_MS = 8000;

const statusTone = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  cancelled: "bg-slate-100 text-slate-700",
};

export default function BuddyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadRequests = async () => {
    try {
      const { data } = await api.get("/api/buddy/requests");
      setRequests(Array.isArray(data?.buddyRequests) ? data.buddyRequests : []);
      setChatRooms(Array.isArray(data?.chatRooms) ? data.chatRooms : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load buddy requests");
    }
  };

  useEffect(() => {
    let active = true;

    const pollRequests = async () => {
      if (!active) return;
      await loadRequests();
    };

    pollRequests();
    const intervalId = window.setInterval(pollRequests, REQUEST_POLL_MS);
    const onFocus = () => pollRequests();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const act = async (endpoint, requestId) => {
    try {
      setBusyId(requestId);
      await api.post(`/api/buddy/${endpoint}`, { requestId });
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${endpoint} request`);
    } finally {
      setBusyId("");
    }
  };

  const summary = useMemo(() => ({
    pending: requests.filter((request) => request.status === "pending").length,
    accepted: requests.filter((request) => request.status === "accepted").length,
    inbound: requests.filter((request) => String(request.receiverId?._id) === String(user?.id || user?._id)).length,
  }), [requests, user]);

  return (
    <TravelSocialShell
      theme="buddy"
      badge="Buddy Requests"
      icon={MessageCircleHeart}
      title="Review requests with more context before you accept, reject, or move into chat."
      description="This view now prioritizes trust, trip overlap, and expectation-setting so you can make faster, safer buddy decisions."
      stats={[
        { label: "Pending", value: summary.pending },
        { label: "Accepted", value: summary.accepted },
        { label: "Chat rooms", value: chatRooms.length },
      ]}
      actions={[
        { label: "Browse more trips", to: "/buddy/browse", variant: "ghost" },
        { label: "Create trip", to: "/buddy/create-trip" },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[1.12fr,0.88fr]">
        <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Request Queue</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Buddy decisions with context</h2>
            </div>
            <div className="flex gap-3">
              <div className="rounded-[22px] bg-sky-50 px-4 py-3 text-sky-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Inbound</p>
                <strong className="mt-2 block text-2xl">{summary.inbound}</strong>
              </div>
              <div className="rounded-[22px] bg-emerald-50 px-4 py-3 text-emerald-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Accepted</p>
                <strong className="mt-2 block text-2xl">{summary.accepted}</strong>
              </div>
            </div>
          </div>
          {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

          <div className="mt-6 space-y-5">
            {requests.map((request) => {
              const isReceiver = String(request.receiverId?._id) === String(user?.id || user?._id);
              const counterpart = isReceiver ? request.senderId : request.receiverId;
              const senderPlan = request.senderPlanId;
              const receiverPlan = request.receiverPlanId;
              const planForCard = isReceiver ? senderPlan : receiverPlan;
              const linkedChatRoom = chatRooms.find(
                (room) => String(room.buddyRequestId?._id || room.buddyRequestId) === String(request._id)
              );
              const trustBadges = getTrustBadges(counterpart, planForCard);
              const completeness = getProfileCompleteness(counterpart, planForCard);

              return (
                <article key={request._id} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={counterpart?.profilePicture || "https://placehold.co/96x96/e2e8f0/475569?text=TR"}
                          alt={counterpart?.name || "Traveler"}
                          className="h-16 w-16 rounded-[22px] object-cover ring-4 ring-white"
                        />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {isReceiver ? "Incoming request" : "Sent request"}
                          </p>
                          <h3 className="mt-1 text-2xl font-bold text-slate-900">{counterpart?.name || "Traveler"}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {request.travelPlanId?.destination || "Travel plan"} • {formatTravelWindow(request.travelPlanId)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {trustBadges.map((badge) => (
                              <span key={badge} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 text-right">
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone[request.status] || statusTone.cancelled}`}>
                          {request.status}
                        </span>
                        <div className="rounded-[22px] bg-slate-50 px-4 py-3 text-left ring-1 ring-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Profile ready</p>
                          <strong className="mt-2 block text-xl text-slate-900">{completeness}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 xl:grid-cols-[1fr,0.9fr]">
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Their plan</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{planForCard?.destination || request.travelPlanId?.destination || "Travel plan"}</p>
                        </div>
                        <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Travel window</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{formatTravelWindow(planForCard || request.travelPlanId)}</p>
                        </div>
                        <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Budget posture</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{getBudgetBand(planForCard?.budget || request.travelPlanId?.budget)}</p>
                        </div>
                      </div>

                      {request.introMessage ? (
                        <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-4">
                          <div className="flex items-center gap-2 text-sky-700">
                            <Sparkles size={16} />
                            <p className="text-sm font-semibold">Intro message</p>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-sky-900/85">{request.introMessage}</p>
                        </div>
                      ) : null}

                      <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <ShieldCheck size={16} />
                          <p className="text-sm font-semibold">Good next conversation topics</p>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-emerald-900/85">
                          <span>• Confirm dates and flexibility</span>
                          <span>• Compare budget and stay comfort</span>
                          <span>• Align travel pace and boundaries</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-slate-50 p-5 ring-1 ring-slate-200">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Decision space</p>
                      <h4 className="mt-2 text-xl font-bold text-slate-900">
                        {request.status === "accepted" ? "Connection unlocked" : "Choose the next step"}
                      </h4>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {request.status === "accepted"
                          ? "This request is already approved. Move into chat and use it like a planning workspace."
                          : "Use the request details to decide if this looks safe, practical, and worth continuing."}
                      </p>

                      <div className="mt-5 grid gap-3">
                        {request.status === "pending" && isReceiver ? (
                          <>
                            <button
                              onClick={() => act("accept", request._id)}
                              disabled={busyId === request._id}
                              className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-emerald-500 px-4 py-3 font-semibold text-white"
                            >
                              <CheckCircle2 size={16} />
                              {busyId === request._id ? "Accepting..." : "Accept and open chat"}
                            </button>
                            <button
                              onClick={() => act("reject", request._id)}
                              disabled={busyId === request._id}
                              className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-rose-500 px-4 py-3 font-semibold text-white"
                            >
                              <XCircle size={16} />
                              Reject request
                            </button>
                          </>
                        ) : null}

                        {request.status === "pending" && !isReceiver ? (
                          <button
                            onClick={() => act("cancel", request._id)}
                            disabled={busyId === request._id}
                            className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-slate-900 px-4 py-3 font-semibold text-white"
                          >
                            <Clock3 size={16} />
                            {busyId === request._id ? "Cancelling..." : "Withdraw request"}
                          </button>
                        ) : null}

                        {request.status === "accepted" && linkedChatRoom ? (
                          <Link
                            to={`/buddy/chat/${linkedChatRoom._id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-sky-500 px-4 py-3 font-semibold text-white"
                          >
                            <MessageSquareText size={16} />
                            Open planning chat
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {requests.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                No buddy requests yet. Send a few thoughtful requests and they will show up here with chat-ready context.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="grid gap-6">
          <div className="rounded-[34px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <MessageSquareText size={18} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Live chats</p>
                <h3 className="text-xl font-bold text-slate-900">Accepted rooms</h3>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {chatRooms.map((room) => (
                <Link key={room._id} to={`/buddy/chat/${room._id}`} className="block rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Planning room</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {room.travelPlanId?.destination || `${room.participants?.length || 2} travelers`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Use chat to settle dates, budget, route, and stay expectations.</p>
                </Link>
              ))}
              {chatRooms.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Accepted requests will open chat rooms here automatically.
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </TravelSocialShell>
  );
}
