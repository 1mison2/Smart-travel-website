import React, { useState } from "react";
import api from "../utils/api";

export default function BuddyFinder() {
  const [peerUserId, setPeerUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");

  const loadConversation = async (e) => {
    e.preventDefault();
    if (!peerUserId.trim()) return;
    try {
      setError("");
      const { data } = await api.get(`/api/chat/conversation/${peerUserId.trim()}`);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load conversation");
      setMessages([]);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-3">Travel Buddy Finder & Chat</h1>
      <p className="text-slate-600 mb-5">
        Enter another user ID to load conversation history. Realtime send/receive is available through Socket.IO backend events.
      </p>

      <form onSubmit={loadConversation} className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded-xl px-3 py-2"
          value={peerUserId}
          onChange={(e) => setPeerUserId(e.target.value)}
          placeholder="Peer User ID"
        />
        <button className="px-4 py-2 rounded-xl bg-teal-700 text-white">Load Chat</button>
      </form>

      {error && <p className="text-red-700 mb-3">{error}</p>}
      <div className="grid gap-2">
        {messages.map((msg) => (
          <article key={msg._id} className="border rounded-xl p-3 bg-white">
            <p className="text-sm">{msg.text}</p>
            <p className="text-xs text-slate-500 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
