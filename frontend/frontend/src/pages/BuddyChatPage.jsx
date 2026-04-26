import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckSquare, Clock3, MapPinned, MessageCircleHeart, Send, Users, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";
import { createSocketConnection } from "../utils/socketClient";
import { formatTravelWindow, getBudgetBand } from "../utils/buddyInsights";

const CHAT_POLL_MS = 5000;

const plannerPrompts = [
  "What dates feel locked for you?",
  "What budget range feels comfortable?",
  "Do you prefer hotels, hostels, or flexible stays?",
  "Should we keep the trip relaxed or activity-heavy?",
];

export default function BuddyChatPage() {
  const { chatRoomId } = useParams();
  const { token, user } = useAuth();
  const [chatRoom, setChatRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [plannerChecklist, setPlannerChecklist] = useState({
    dates: false,
    budget: false,
    stay: false,
    pace: false,
  });
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const optimisticCounterRef = useRef(0);

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/api/chat/${chatRoomId}`);
      setChatRoom(data?.chatRoom || null);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load chat");
    }
  };

  useEffect(() => {
    const syncMessages = async () => {
      await loadMessages();
    };
    syncMessages();
  }, [chatRoomId]);

  useEffect(() => {
    if (!chatRoomId) return undefined;

    const intervalId = window.setInterval(() => {
      loadMessages();
    }, CHAT_POLL_MS);

    const onFocus = () => {
      loadMessages();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [chatRoomId]);

  useEffect(() => {
    let active = true;
    createSocketConnection(token)
      .then((socket) => {
        if (!active || !socket) return;
        socketRef.current = socket;
        socket.emit("chat:join-room", { chatRoomId });
        socket.on("chat:room-message", (message) => {
          setMessages((current) => {
            if (current.some((item) => String(item._id) === String(message._id))) return current;
            return [...current.filter((item) => !String(item._id).startsWith("local-")), message];
          });
        });
        socket.on("chat:error", (payload) => {
          setError(payload?.message || "Chat connection issue");
        });
      })
      .catch(() => {});

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [chatRoomId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event, quickMessage) => {
    if (event) event.preventDefault();
    const nextMessage = String(quickMessage || draft).trim();
    if (!nextMessage) return;

    optimisticCounterRef.current += 1;
    const optimistic = {
      _id: `local-${optimisticCounterRef.current}`,
      senderId: { _id: user?.id || user?._id, name: user?.name || "You" },
      message: nextMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);
    setDraft("");

    try {
      if (socketRef.current) {
        socketRef.current.emit("chat:send-room", { chatRoomId, message: nextMessage });
      } else {
        await api.post("/api/chat/message", { chatRoomId, message: nextMessage });
        await loadMessages();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send message");
      setMessages((current) => current.filter((item) => item._id !== optimistic._id));
    }
  };

  const otherTraveler = useMemo(
    () => (chatRoom?.participants || []).find((participant) => String(participant._id) !== String(user?.id || user?._id)) || null,
    [chatRoom, user]
  );

  const plan = chatRoom?.travelPlanId || null;
  const checklistItems = [
    { key: "dates", label: "Dates aligned" },
    { key: "budget", label: "Budget discussed" },
    { key: "stay", label: "Stay preference discussed" },
    { key: "pace", label: "Trip pace aligned" },
  ];

  return (
    <TravelSocialShell
      theme="buddy"
      badge="Buddy Chat"
      icon={MessageCircleHeart}
      title={chatRoom ? "Use chat like a shared trip-planning workspace." : "Loading your private planning room."}
      description="This room is now more than messaging. It gives both travelers a clearer place to align timing, budget, comfort level, and next decisions."
      stats={[
        { label: "Messages", value: messages.length },
        { label: "Partner", value: otherTraveler?.name || "Pending" },
        { label: "Room", value: chatRoomId ? "Open" : "Pending" },
      ]}
      actions={[
        { label: "Back to requests", to: "/buddy/requests", variant: "ghost" },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[0.82fr,1.18fr]">
        <aside className="space-y-6">
          <section className="rounded-[34px] bg-gradient-to-br from-slate-900 via-sky-800 to-teal-700 p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-white/10 p-3 text-white">
                <Users size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Planning Room</p>
                <h2 className="mt-2 text-3xl font-bold">Decide if this trip fit is real.</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm leading-7 text-sky-50/85">
              <p>Use this room to agree on timing, spend, route expectations, and comfort level before you commit to a real-world plan.</p>
              <p>Keep the conversation practical so both sides can say yes, no, or not yet with clarity.</p>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Shared trip snapshot</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Destination</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{plan?.destination || "Trip plan attached"}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock3 size={15} />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Window</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatTravelWindow(plan)}</p>
                </div>
                <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Wallet size={15} />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Budget lane</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{getBudgetBand(plan?.budget)}</p>
                </div>
              </div>
              <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPinned size={15} />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Style</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{plan?.travelStyle || "Travel style not specified yet"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-slate-900">
              <CheckSquare size={16} />
              <h3 className="text-lg font-bold">Planning checklist</h3>
            </div>
            <div className="mt-4 grid gap-3">
              {checklistItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setPlannerChecklist((current) => ({ ...current, [item.key]: !current[item.key] }))
                  }
                  className={`flex items-center justify-between rounded-[20px] px-4 py-3 text-left ring-1 ${
                    plannerChecklist[item.key]
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-slate-50 text-slate-700 ring-slate-200"
                  }`}
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">
                    {plannerChecklist[item.key] ? "Done" : "Open"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="rounded-[34px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          {error && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

          <div className="mb-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Prompt shortcuts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {plannerPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(null, prompt)}
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-sky-50 hover:text-sky-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[560px] overflow-y-auto rounded-[30px] bg-slate-50 p-4 ring-1 ring-slate-200">
            {messages.map((message) => {
              const mine = String(message.senderId?._id || message.senderId) === String(user?.id || user?._id);
              return (
                <div key={message._id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-[24px] px-4 py-3 text-sm shadow-sm ${mine ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                    <p className="font-medium">{mine ? "You" : message.senderId?.name || "Traveler"}</p>
                    <p className="mt-1 whitespace-pre-wrap leading-7">{message.message}</p>
                    <p className={`mt-2 text-xs ${mine ? "text-sky-50/80" : "text-slate-400"}`}>
                      {new Date(message.timestamp || message.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="mt-4 flex gap-3">
            <input
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              placeholder="Write a practical planning message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-700 px-5 py-3.5 font-semibold text-white">
              <Send size={16} />
              Send
            </button>
          </form>
        </section>
      </div>
    </TravelSocialShell>
  );
}
