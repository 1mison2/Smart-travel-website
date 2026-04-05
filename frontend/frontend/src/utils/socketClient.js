import api from "./api";

let socketScriptPromise = null;

const resolveSocketScriptUrl = () => {
  const base = String(api.defaults.baseURL || "").replace(/\/+$/, "");
  return `${base}/socket.io/socket.io.js`;
};

export const loadSocketIoClient = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.io) return Promise.resolve(window.io);
  if (socketScriptPromise) return socketScriptPromise;

  socketScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = resolveSocketScriptUrl();
    script.async = true;
    script.onload = () => resolve(window.io || null);
    script.onerror = () => reject(new Error("Failed to load Socket.IO client"));
    document.body.appendChild(script);
  });

  return socketScriptPromise;
};

export const createSocketConnection = async (token) => {
  const io = await loadSocketIoClient();
  if (!io || !token) return null;
  const base = String(api.defaults.baseURL || "").replace(/\/+$/, "");
  return io(base, {
    auth: { token: `Bearer ${token}` },
    transports: ["websocket", "polling"],
  });
};
