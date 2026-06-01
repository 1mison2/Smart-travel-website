import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  MessageCircleMore,
  Paperclip,
  SendHorizonal,
  Smile,
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
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getLastMessage(room) {
  return room?.lastMessage?.message || room?.lastMessage || "Accepted chat";
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
    <div className="buddy-chat-ui">
      <section className="buddy-chat-ui__rooms">
        <div className="buddy-chat-ui__rooms-head">
          <p>List of chats</p>
          <div>
            <h3>Private travel chats</h3>
            <span>This left-side list is the people you have already chatted with.</span>
          </div>
          <div className="buddy-chat-ui__room-count">
            {refreshingRooms ? "Syncing" : `${rooms.length} rooms`}
          </div>
        </div>

        <div className="buddy-chat-ui__room-list">
          {rooms.map((room) => {
            const other =
              (room.participants || []).find(
                (participant) => String(participant._id) !== String(user?._id)
              ) || room.participants?.[0];
            const isActive = activeRoomId === room._id;
            const lastMessage = getLastMessage(room);
            return (
              <button
                key={room._id}
                type="button"
                onClick={() => setActiveRoomId(room._id)}
                className={`buddy-chat-ui__room-card ${isActive ? "is-active" : ""}`}
              >
                <div className="buddy-chat-ui__avatar-wrap">
                  <div className="buddy-chat-ui__avatar">
                    {initialsFromName(other?.name)}
                  </div>
                  {!isActive ? <span className="buddy-chat-ui__unread-dot" /> : null}
                </div>
                <div className="buddy-chat-ui__room-copy">
                  <div className="buddy-chat-ui__room-top">
                    <strong>{other?.name || "Chat room"}</strong>
                    <time>{formatRoomTime(room?.updatedAt || room?.createdAt)}</time>
                  </div>
                  <span className="buddy-chat-ui__destination">
                    {room.travelPlanId?.destination || "Travel chat"}
                  </span>
                  <p>{lastMessage}</p>
                  <small>Accepted chat</small>
                </div>
              </button>
            );
          })}

          {rooms.length === 0 ? (
            <div className="buddy-chat-ui__empty">
              No accepted buddy requests yet. Accept a request to unlock private chat.
            </div>
          ) : null}
        </div>
      </section>

      <section className="buddy-chat-ui__window">
        <div className="buddy-chat-ui__chat-head">
          <div className="buddy-chat-ui__avatar buddy-chat-ui__avatar--large">
            {initialsFromName(activeRoomPartner?.name)}
          </div>
          <div>
            <h4>{activeRoomPartner?.name || "Private chat room"}</h4>
            <div className="buddy-chat-ui__meta-row">
              {activeRoom?.travelPlanId?.destination ? (
                <span>
                  <MapPin size={13} />
                  {activeRoom.travelPlanId.destination}
                </span>
              ) : null}
              {activeRoom?.travelPlanId?.startDate ? (
                <span>
                  <CalendarDays size={13} />
                  {formatRoomTime(activeRoom.travelPlanId.startDate)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="buddy-chat-ui__messages">
          {messages.length > 0 ? (
            <div className="buddy-chat-ui__message-stack">
              {messages.map((message) => {
                const isMine =
                  String(message.senderId?._id || message.senderId) === String(user?._id);
                return (
                  <div
                    key={message._id}
                    className={`buddy-chat-ui__message ${isMine ? "is-mine" : ""}`}
                  >
                    <p className="buddy-chat-ui__sender">
                      {isMine ? "You" : message.senderId?.name || activeRoomPartner?.name || "Traveler"}
                    </p>
                    <p>{message.message}</p>
                    <time>{formatMessageTime(message.timestamp || message.createdAt)}</time>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="buddy-chat-ui__empty-state">
              <MessageCircleMore size={24} />
              <h5>{activeRoomPartner ? `Start the chat with ${activeRoomPartner.name}` : "Choose a chat room"}</h5>
              <p>
                {activeRoomPartner
                  ? "A simple opener works best. Ask about arrival dates, travel pace, or whether they want to compare stays first."
                  : "Select a room on the left to view messages and keep trip planning in one place."}
              </p>
                {activeRoomPartner ? (
                  <div className="buddy-chat-ui__quick-replies">
                    <button
                      type="button"
                      onClick={() => setDraft("Hi! Want to compare arrival dates and see how our plans line up?")}
                    >
                      Compare dates
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft("Hey! I saw we have a similar trip style. Want to compare stays and budget first?")}
                    >
                      Compare budget
                    </button>
                  </div>
                ) : null}
            </div>
          )}
        </div>

        <div className="buddy-chat-ui__composer">
          <button type="button" aria-label="Emoji" disabled={!activeRoomId}>
            <Smile size={18} />
          </button>
          <button type="button" aria-label="Attach file" disabled={!activeRoomId}>
            <Paperclip size={18} />
          </button>
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
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!activeRoomId || sending || !draft.trim()}
              className="buddy-chat-ui__send"
            >
              <SendHorizonal size={16} />
              {sending ? "Sending..." : "Send"}
            </button>
        </div>
      </section>

      <style>{`
        .buddy-chat-ui {
          display: grid;
          grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
          gap: 20px;
          min-height: 680px;
        }

        .buddy-chat-ui__rooms,
        .buddy-chat-ui__window {
          overflow: hidden;
          border: 1px solid rgba(203, 213, 225, 0.9);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 22px 50px rgba(15, 23, 42, 0.08);
        }

        .buddy-chat-ui__rooms {
          align-self: start;
        }

        .buddy-chat-ui__rooms-head {
          display: grid;
          gap: 10px;
          padding: 22px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.95);
          background: linear-gradient(135deg, #f0fdfa, #f8fafc);
        }

        .buddy-chat-ui__rooms-head p {
          margin: 0;
          color: #0f766e;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .buddy-chat-ui__rooms-head h3 {
          margin: 0;
          color: #0f172a;
          font-size: 1.35rem;
          line-height: 1.15;
        }

        .buddy-chat-ui__rooms-head span {
          display: block;
          margin-top: 6px;
          color: #94a3b8;
          font-size: 0.86rem;
          line-height: 1.5;
        }

        .buddy-chat-ui__room-count {
          width: max-content;
          border-radius: 999px;
          background: #ecfdf5;
          padding: 7px 11px;
          color: #047857;
          font-size: 0.76rem;
          font-weight: 800;
        }

        .buddy-chat-ui__room-list {
          display: grid;
          gap: 10px;
          max-height: 520px;
          overflow: auto;
          padding: 14px;
        }

        .buddy-chat-ui__room-card {
          display: flex;
          gap: 12px;
          width: 100%;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-left: 4px solid transparent;
          border-radius: 20px;
          background: #f8fafc;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }

        .buddy-chat-ui__room-card:hover {
          transform: translateY(-1px);
          border-color: rgba(45, 212, 191, 0.55);
        }

        .buddy-chat-ui__room-card.is-active {
          border-color: rgba(20, 184, 166, 0.5);
          border-left-color: #0f766e;
          background: linear-gradient(135deg, #ecfeff, #f0fdf4);
          box-shadow: 0 16px 34px rgba(20, 184, 166, 0.12);
        }

        .buddy-chat-ui__avatar-wrap {
          position: relative;
          flex: 0 0 auto;
        }

        .buddy-chat-ui__avatar {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: linear-gradient(135deg, #0f766e, #22c55e);
          color: #fff;
          font-size: 0.84rem;
          font-weight: 900;
        }

        .buddy-chat-ui__avatar--large {
          width: 54px;
          height: 54px;
          border-radius: 18px;
        }

        .buddy-chat-ui__unread-dot {
          position: absolute;
          right: -2px;
          top: -2px;
          width: 11px;
          height: 11px;
          border-radius: 999px;
          border: 2px solid #fff;
          background: #14b8a6;
        }

        .buddy-chat-ui__room-copy {
          min-width: 0;
          flex: 1;
        }

        .buddy-chat-ui__room-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .buddy-chat-ui__room-top strong {
          overflow: hidden;
          color: #0f172a;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .buddy-chat-ui__room-top time {
          flex: 0 0 auto;
          color: #94a3b8;
          font-size: 0.74rem;
          font-weight: 700;
        }

        .buddy-chat-ui__destination,
        .buddy-chat-ui__room-copy p {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .buddy-chat-ui__destination {
          margin-top: 4px;
          color: #64748b;
          font-size: 0.83rem;
        }

        .buddy-chat-ui__room-copy p {
          margin: 8px 0 0;
          color: #475569;
          font-size: 0.86rem;
        }

        .buddy-chat-ui__room-copy small {
          display: inline-flex;
          margin-top: 10px;
          border-radius: 999px;
          background: #fff;
          padding: 5px 9px;
          color: #0f766e;
          font-size: 0.7rem;
          font-weight: 900;
          box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.18);
        }

        .buddy-chat-ui__window {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          min-height: 680px;
        }

        .buddy-chat-ui__chat-head {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.95);
          background: rgba(255, 255, 255, 0.96);
          padding: 18px 22px;
          backdrop-filter: blur(12px);
        }

        .buddy-chat-ui__chat-head h4 {
          margin: 0;
          color: #0f172a;
          font-size: 1.15rem;
        }

        .buddy-chat-ui__meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 7px;
        }

        .buddy-chat-ui__meta-row span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          background: #f1f5f9;
          padding: 5px 9px;
          color: #64748b;
          font-size: 0.76rem;
          font-weight: 800;
        }

        .buddy-chat-ui__messages {
          min-height: 0;
          overflow-y: auto;
          background: linear-gradient(180deg, #f8fafc, #ffffff);
          padding: 22px;
        }

        .buddy-chat-ui__message-stack {
          display: grid;
          gap: 12px;
        }

        .buddy-chat-ui__message {
          width: fit-content;
          max-width: min(620px, 78%);
          border-radius: 22px 22px 22px 6px;
          background: #e2e8f0;
          padding: 12px 14px;
          color: #334155;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .buddy-chat-ui__message.is-mine {
          justify-self: end;
          border-radius: 22px 22px 6px 22px;
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: #fff;
        }

        .buddy-chat-ui__message p {
          margin: 0;
          line-height: 1.55;
        }

        .buddy-chat-ui__sender,
        .buddy-chat-ui__message time {
          display: block;
          font-size: 0.72rem;
          font-weight: 800;
          opacity: 0.72;
        }

        .buddy-chat-ui__message time {
          margin-top: 6px;
          text-align: right;
        }

        .buddy-chat-ui__empty,
        .buddy-chat-ui__empty-state {
          border: 1px dashed rgba(148, 163, 184, 0.65);
          border-radius: 22px;
          background: #f8fafc;
          padding: 22px;
          color: #64748b;
          text-align: center;
        }

        .buddy-chat-ui__empty-state {
          display: grid;
          place-items: center;
          gap: 10px;
          max-width: 460px;
          margin: 110px auto 0;
          background: #fff;
        }

        .buddy-chat-ui__empty-state h5,
        .buddy-chat-ui__empty-state p {
          margin: 0;
        }

        .buddy-chat-ui__empty-state h5 {
          color: #0f172a;
          font-size: 1.08rem;
        }

        .buddy-chat-ui__quick-replies {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
        }

        .buddy-chat-ui__quick-replies button {
          border: 1px solid rgba(226, 232, 240, 1);
          border-radius: 999px;
          background: #f8fafc;
          padding: 8px 11px;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .buddy-chat-ui__composer {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          border-top: 1px solid rgba(226, 232, 240, 0.95);
          background: #fff;
          padding: 16px 18px;
        }

        .buddy-chat-ui__composer > button:not(.buddy-chat-ui__send) {
          display: inline-grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(226, 232, 240, 1);
          border-radius: 999px;
          background: #f8fafc;
          color: #475569;
        }

        .buddy-chat-ui__composer input {
          min-width: 0;
          border: 1px solid rgba(226, 232, 240, 1);
          border-radius: 999px;
          background: #f8fafc;
          padding: 13px 16px;
          color: #0f172a;
          outline: none;
        }

        .buddy-chat-ui__composer input:focus {
          border-color: rgba(20, 184, 166, 0.55);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .buddy-chat-ui__send {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, #0f766e, #22c55e);
          padding: 13px 18px;
          color: #fff;
          font-weight: 900;
          box-shadow: 0 14px 28px rgba(15, 118, 110, 0.18);
        }

        .buddy-chat-ui__composer button:disabled,
        .buddy-chat-ui__composer input:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        @media (max-width: 1180px) {
          .buddy-chat-ui {
            grid-template-columns: 1fr;
          }

          .buddy-chat-ui__room-list {
            max-height: 360px;
          }
        }

        @media (max-width: 640px) {
          .buddy-chat-ui__composer {
            grid-template-columns: auto auto 1fr;
          }

          .buddy-chat-ui__send {
            grid-column: 1 / -1;
          }

          .buddy-chat-ui__message {
            max-width: 92%;
          }
        }
      `}</style>
    </div>
  );
}
