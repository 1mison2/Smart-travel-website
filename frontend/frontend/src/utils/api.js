import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export default api; 
