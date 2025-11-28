import axios from "axios";

const resolveApiBase = () => {
  const envBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (envBase) return envBase;
  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/$/, "")}/api`;
  }
  return "http://localhost:5001/api";
};

const BASE_URL = resolveApiBase();

const api = axios.create({
  baseURL: BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem("auth-storage");
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

export default api;
