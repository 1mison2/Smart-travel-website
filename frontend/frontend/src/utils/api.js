import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";
const CLEAN_API_BASE = API_BASE.replace(/\/+$/, "");

const api = axios.create({
  baseURL: CLEAN_API_BASE,
});

export const resolveImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith("/")) return `${CLEAN_API_BASE}${imagePath}`;
  return `${CLEAN_API_BASE}/${imagePath}`;
};

export default api;
