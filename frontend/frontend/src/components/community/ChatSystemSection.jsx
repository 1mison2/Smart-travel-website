import React, { useEffect, useRef, useState } from "react";
import { MessageCircleMore, SendHorizonal } from "lucide-react";
import api from "../../utils/api";
import { createSocketConnection } from "../../utils/socketClient";
import { useAuth } from "../../context/AuthContext";
import SectionSkeleton from "./SectionSkeleton";

export default function ChatSystemSection({ onNotify }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/buddy/requests");
      const nextRooms = data?.chatRooms || [];
      setRooms(nextRooms);
      if (!activeRoomId && nextRooms[0]?._id) setActiveRoomId(nextRooms[0]._id);
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load chat rooms." });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) return;
    try {
      const { data } = await api.get(`/api/chat/${roomId}`);
      setMessages(data?.messages || []);
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to load chat messages." });
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    loadMessages(activeRoomId);
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
            setMessages((current) => [...current, message]);
          }
        });
      } catch (_err) {
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
      await api.post("/api/chat/message", { chatRoomId: activeRoomId, message: trimmed });
      await loadMessages(activeRoomId);
    } catch (_err) {
      onNotify?.({ type: "error", message: "Failed to send message." });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <SectionSkeleton cards={2} />;

  return (
    <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#0f3f66_55%,#0ea5e9)] px-5 py-5 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-sky-100">Messages / Chat</p>
          <h3 className="mt-3 text-2xl font-bold leading-tight">Accepted buddy conversations</h3>
          <p className="mt-2 text-sm leading-7 text-sky-50/85">Private rooms open only after both travelers agree.</p>
        </div>
        <div className="grid gap-3 p-4">
          {rooms.map((room) => {
            const other = (room.participants || []).find((participant) => String(participant._id) !== String(user?._id)) || room.participants?.[0];
            return (
              <button
                key={room._id}
                type="button"
                onClick={() => setActiveRoomId(room._id)}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  activeRoomId === room._id ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <p className="font-semibold text-slate-900">{other?.name || "Chat room"}</p>
                <p className="mt-1 text-sm text-slate-500">{room.travelPlanId?.destination || "Travel chat"}</p>
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
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
              <MessageCircleMore size={18} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Private chat room</h4>
              <p className="text-sm text-slate-500">Real-time planning for accepted buddy requests.</p>
            </div>
          </div>
        </div>

        <div className="h-[520px] overflow-y-auto bg-[linear-gradient(180deg,#f8fafc,#ffffff)] px-5 py-5">
          <div className="grid gap-3">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`max-w-[80%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm ${
                  String(message.senderId?._id || message.senderId) === String(user?._id)
                    ? "ml-auto bg-sky-500 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <p className="text-xs font-semibold opacity-75">{message.senderId?.name || "Traveler"}</p>
                <p>{message.message}</p>
                <p className="mt-1 text-[11px] opacity-75">{new Date(message.timestamp || message.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {messages.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                Select a room to view the conversation.
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="flex gap-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!activeRoomId || sending}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              <SendHorizonal size={16} />
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
