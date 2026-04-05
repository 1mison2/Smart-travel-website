import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircleHeart, MessageSquareText, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";

export default function BuddyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [error, setError] = useState("");

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
    loadRequests();
  }, []);

  const act = async (endpoint, requestId) => {
    try {
      await api.post(`/api/buddy/${endpoint}`, { requestId });
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${endpoint} request`);
    }
  };

  return (
    <TravelSocialShell
      theme="buddy"
      badge="Buddy Requests"
      icon={MessageCircleHeart}
      title="Track incoming requests, approve the right match, and move into chat."
      stats={[
        { label: "Requests", value: requests.length },
        { label: "Chats", value: chatRooms.length },
        { label: "Role", value: user?.role || "user" },
      ]}
      actions={[
        { label: "Browse more trips", to: "/buddy/browse", variant: "ghost" },
        { label: "Create trip", to: "/buddy/create-trip" },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-[34px] border border-white/70 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Request Queue</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Travel connections</h2>
            </div>
            <span className="rounded-2xl bg-sky-50 p-3 text-sky-700">
              <Sparkles size={20} />
            </span>
          </div>
          {error && <p className="mt-4 text-sm font-medium text-rose-700">{error}</p>}
          <div className="mt-6 space-y-4">
            {requests.map((request) => {
              const sender = request.senderId?.name || "Traveler";
              const receiver = request.receiverId?.name || "Traveler";
              const isReceiver = String(request.receiverId?._id) === String(user?.id || user?._id);
              const isSender = String(request.senderId?._id) === String(user?.id || user?._id);
              const linkedChatRoom = chatRooms.find(
                (room) => String(room.buddyRequestId?._id || room.buddyRequestId) === String(request._id)
              );

              return (
                <article key={request._id} className="rounded-[28px] bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{request.travelPlanId?.destination || "Travel plan"}</h3>
                      <p className="text-sm text-slate-500">{`${sender} -> ${receiver}`}</p>
                    </div>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      {request.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {request.status === "pending" && isReceiver && (
                      <>
                        <button onClick={() => act("accept", request._id)} className="rounded-2xl bg-emerald-500 px-4 py-2.5 font-semibold text-white">Accept</button>
                        <button onClick={() => act("reject", request._id)} className="rounded-2xl bg-rose-500 px-4 py-2.5 font-semibold text-white">Reject</button>
                      </>
                    )}
                    {request.status === "pending" && isSender && (
                      <button onClick={() => act("cancel", request._id)} className="rounded-2xl bg-slate-900 px-4 py-2.5 font-semibold text-white">Cancel</button>
                    )}
                    {request.status === "accepted" && linkedChatRoom && (
                      <Link to={`/buddy/chat/${linkedChatRoom._id}`} className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2.5 font-semibold text-white">
                        <MessageSquareText size={16} />
                        Open chat
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="grid gap-6">
          <div className="rounded-[34px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <div className="space-y-4">
              {chatRooms.map((room) => (
                <Link key={room._id} to={`/buddy/chat/${room._id}`} className="block rounded-[26px] bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Chat Room</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {room.travelPlanId?.destination || `${room.participants?.length || 2} travelers`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Open the conversation and continue planning together.</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </TravelSocialShell>
  );
}
