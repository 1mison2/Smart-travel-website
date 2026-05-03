import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  MessageCircleMore,
  SendHorizonal,
} from "lucide-react";
import api from "../../utils/api";
import { createSocketConnection } from "../../utils/socketClient";
import { useAuth } from "../../context/AuthContext";
import SectionSkeleton from "./SectionSkeleton";

const CHAT_POLL_MS = 6000;

function initialsFromName(name) {
  return String(name || "Traveler")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatRoomTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function ChatSystemSection({ onNotify }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshingRooms, setRefreshingRooms] = useState(false);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const previousMessageCountRef = useRef(0);

  const activeRoom = useMemo(
    () => rooms.find((room) => String(room._id) === String(activeRoomId)) || null,
    [activeRoomId, rooms]
  );

  const activeRoomPartner = useMemo(() => {
    if (!activeRoom) return null;
    return (
      (activeRoom.participants || []).find(
        (participant) => String(participant._id) !== String(user?._id)
      ) || activeRoom.participants?.[0] || null
    );
  }, [activeRoom, user?._id]);

  const applyRooms = (nextRooms) => {
    setRooms((current) => {
      const currentSignature = current
        .map((room) => `${room?._id}:${room?.updatedAt || room?.createdAt || ""}`)
        .join("|");
      const nextSignature = nextRooms
        .map((room) => `${room?._id}:${room?.updatedAt || room?.createdAt || ""}`)
        .join("|");
      return currentSignature === nextSignature ? current : nextRooms;
    });
  };

  const applyMessages = (nextMessages) => {
    setMessages((current) => {
      const currentSignature = current
        .map(
          (message) =>
            `${message?._id}:${message?.updatedAt || message?.createdAt || message?.timestamp || ""}`
        )
        .join("|");
      const nextSignature = nextMessages
        .map(
          (message) =>
            `${message?._id}:${message?.updatedAt || message?.createdAt || message?.timestamp || ""}`
        )
        .join("|");
      return currentSignature === nextSignature ? current : nextMessages;
    });
  };

  const loadRooms = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshingRooms(true);
      } else {
        setLoading(true);
      }
      const { data } = await api.get("/api/buddy/requests");
      const nextRooms = Array.isArray(data?.chatRooms) ? data.chatRooms : [];
      applyRooms(nextRooms);
      if (!activeRoomId && nextRooms[0]?._id) setActiveRoomId(nextRooms[0]._id);
    } catch {
      onNotify?.({ type: "error", message: "Failed to load chat rooms." });
    } finally {
      if (silent) {
        setRefreshingRooms(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) return;
    try {
      const { data } = await api.get(`/api/chat/${roomId}`);
      applyMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch {
      onNotify?.({ type: "error", message: "Failed to load chat messages." });
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadRooms({ silent: true });
      if (activeRoomId) loadMessages(activeRoomId);
    }, CHAT_POLL_MS);

    const onFocus = () => {
      loadRooms({ silent: true });
      if (activeRoomId) loadMessages(activeRoomId);
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [activeRoomId]);

  useEffect(() => {
    loadMessages(activeRoomId);
  }, [activeRoomId]);

  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    previousMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    const connect = async () => {
      try {
        const token = localStorage.getItem("st_token");
        const socket = await createSocketConnection(token);
        if (!mounted || !socket) return;
        socketRef.current = socket;
        socket.on("chat:room-message", (message) => {
          if (String(message.chatRoomId) === String(activeRoomId)) {
            setMessages((current) => {
              if (current.some((item) => String(item._id) === String(message._id))) {
                return current;
              }
              return [...current, message];
            });
          }
        });
      } catch {
        // REST fallback remains available
      }
    };
    connect();
    return () => {
      mounted = false;
      socketRef.current?.disconnect?.();
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (activeRoomId && socketRef.current) {
      socketRef.current.emit("chat:join-room", { chatRoomId: activeRoomId });
    }
  }, [activeRoomId]);

  const sendMessage = async () => {
    if (!activeRoomId || !draft.trim()) return;
    try {
      setSending(true);
      const trimmed = draft.trim();
      setDraft("");
      await api.post("/api/chat/message", {
        chatRoomId: activeRoomId,
        message: trimmed,
      });
      await loadMessages(activeRoomId);
    } catch {
      onNotify?.({ type: "error", message: "Failed to send message." });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <SectionSkeleton cards={2} />;

  return (
    <div className="grid gap-6 xl:grid-cols-[340px,1fr]">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#0f3f66_55%,#0ea5e9)] px-5 py-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                List of chats
              </p>
              <h3 className="mt-2 text-2xl font-bold leading-tight">Private travel chats</h3>
              <p className="mt-1 text-sm text-white/70">
                This left-side list is the people you have already chatted with.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {refreshingRooms ? (
                <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                  Syncing
                </span>
              ) : null}
              <div className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                {rooms.length} rooms
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4">
          {rooms.map((room) => {
            const other =
              (room.participants || []).find(
                (participant) => String(participant._id) !== String(user?._id)
              ) || room.participants?.[0];
            const isActive = activeRoomId === room._id;
            return (
              <button
                key={room._id}
                type="button"
                onClick={() => setActiveRoomId(room._id)}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-sky-200 bg-sky-50 shadow-[0_12px_28px_rgba(14,165,233,0.08)]"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#14b8a6)] text-sm font-bold text-white">
                    {initialsFromName(other?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">
                        {other?.name || "Chat room"}
                      </p>
                      <span className="text-xs font-medium text-slate-400">
                        {formatRoomTime(room?.updatedAt || room?.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {room.travelPlanId?.destination || "Travel chat"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        Accepted chat
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {rooms.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No accepted buddy requests yet. Accept a request to unlock private chat.
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                <MessageCircleMore size={18} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  {activeRoomPartner?.name || "Private chat room"}
                </h4>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  {activeRoom?.travelPlanId?.destination ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                      <MapPin size={12} />
                      {activeRoom.travelPlanId.destination}
                    </span>
                  ) : null}
                  {activeRoom?.travelPlanId?.startDate ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                      <CalendarDays size={12} />
                      {formatRoomTime(activeRoom.travelPlanId.startDate)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="h-[520px] overflow-y-auto bg-[linear-gradient(180deg,#f8fafc,#ffffff)] px-5 py-5">
          {messages.length > 0 ? (
            <div className="grid gap-3">
              {messages.map((message) => {
                const isMine =
                  String(message.senderId?._id || message.senderId) === String(user?._id);
                return (
                  <div
                    key={message._id}
                    className={`max-w-[82%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm ${
                      isMine
                        ? "ml-auto bg-sky-500 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <p className="text-xs font-semibold opacity-75">
                      {message.senderId?.name || "Traveler"}
                    </p>
                    <p>{message.message}</p>
                    <p className="mt-1 text-[11px] opacity-75">
                      {formatMessageTime(message.timestamp || message.createdAt)}
                    </p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="grid h-full place-items-center">
              <div className="max-w-md rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                  <MessageCircleMore size={22} />
                </div>
                <h5 className="text-lg font-bold text-slate-900">
                  {activeRoomPartner ? `Start the chat with ${activeRoomPartner.name}` : "Choose a chat room"}
                </h5>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {activeRoomPartner
                    ? "A simple opener works best. Ask about arrival dates, travel pace, or whether they want to compare stays first."
                    : "Select a room on the left to view messages and keep trip planning in one place."}
                </p>
                {activeRoomPartner ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft("Hi! Want to compare arrival dates and see how our plans line up?")}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Compare dates
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft("Hey! I saw we have a similar trip style. Want to compare stays and budget first?")}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Compare budget
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                activeRoomId
                  ? "Type a message..."
                  : "Select a room to start chatting"
              }
              disabled={!activeRoomId}
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!activeRoomId || sending || !draft.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SendHorizonal size={16} />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
