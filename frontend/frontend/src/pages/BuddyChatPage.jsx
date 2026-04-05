import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MessageCircleHeart, Send, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TravelSocialShell from "../components/TravelSocialShell";
import api from "../utils/api";
import { createSocketConnection } from "../utils/socketClient";

export default function BuddyChatPage() {
  const { chatRoomId } = useParams();
  const { token, user } = useAuth();
  const [chatRoom, setChatRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

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
    loadMessages();
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

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;

    const optimistic = {
      _id: `local-${Date.now()}`,
      senderId: { _id: user?.id || user?._id, name: user?.name || "You" },
      message: draft.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);
    const nextMessage = draft.trim();
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

  return (
    <TravelSocialShell
      theme="buddy"
      badge="Buddy Chat"
      icon={MessageCircleHeart}
      title={chatRoom ? "Your private planning room is live." : "Loading your private chat room."}
      description="Use this space to coordinate timing, budgets, routes, and expectations once both sides have accepted the buddy request."
      stats={[
        { label: "Messages", value: messages.length },
        { label: "Room", value: chatRoomId ? "Open" : "Pending" },
        { label: "Realtime", value: "On" },
      ]}
      actions={[
        { label: "Back to requests", to: "/buddy/requests", variant: "ghost" },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <aside className="rounded-[34px] bg-gradient-to-br from-slate-900 via-sky-800 to-teal-700 p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-white/10 p-3 text-white">
              <Users size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Conversation Space</p>
              <h2 className="mt-2 text-3xl font-bold">Plan together clearly.</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm leading-7 text-sky-50/80">
            <p>Share meeting points, budget updates, route ideas, and accommodation preferences.</p>
            <p>Keep the chat practical so you can decide quickly whether the trip fit is still right.</p>
          </div>
        </aside>

        <section className="rounded-[34px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          {error && <p className="mb-4 text-sm font-medium text-rose-700">{error}</p>}

          <div className="h-[560px] overflow-y-auto rounded-[30px] bg-slate-50 p-4 ring-1 ring-slate-200">
            {messages.map((message) => {
              const mine = String(message.senderId?._id || message.senderId) === String(user?.id || user?._id);
              return (
                <div key={message._id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-[24px] px-4 py-3 text-sm shadow-sm ${mine ? "bg-gradient-to-r from-sky-500 to-emerald-500 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                    <p className="font-medium">{mine ? "You" : message.senderId?.name || "Traveler"}</p>
                    <p className="mt-1 whitespace-pre-wrap leading-7">{message.message}</p>
                    <p className={`mt-2 text-xs ${mine ? "text-sky-50/80" : "text-slate-400"}`}>{new Date(message.timestamp || message.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="mt-4 flex gap-3">
            <input className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" placeholder="Write a message..." value={draft} onChange={(e) => setDraft(e.target.value)} />
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
