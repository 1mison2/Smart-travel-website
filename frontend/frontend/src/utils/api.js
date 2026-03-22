import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";
const CLEAN_API_BASE = API_BASE.replace(/\/+$/, "");

const api = axios.create({
  baseURL: CLEAN_API_BASE,
});

// Ensure the token is attached even on the first request after refresh.
try {
  const storedToken = localStorage.getItem("st_token");
  if (storedToken) api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
} catch {
  // ignore storage errors (e.g., SSR or blocked storage)
}

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("st_token");
    if (token && !config.headers?.Authorization) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
  } catch {
    // ignore storage errors
  }
  return config;
});

export const resolveImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith("/")) return `${CLEAN_API_BASE}${imagePath}`;
  return `${CLEAN_API_BASE}/${imagePath}`;
};

export default api;
