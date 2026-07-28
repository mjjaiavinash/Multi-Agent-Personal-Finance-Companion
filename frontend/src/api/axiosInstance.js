import axios from "axios";

/**
 * Centralized Axios instance for all API calls.
 *
 * Request interceptor:  Attaches the JWT Bearer token from localStorage.
 * Response interceptor: Handles global 401 Unauthorized — auto-clears session
 *                       and redirects to /login so the user is never stuck in
 *                       a partially authenticated state with an expired token.
 *
 * A 30-second timeout is set to surface network issues instead of hanging silently.
 */
const api = axios.create({
  baseURL:         import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout:         120_000, // 120 seconds — orchestrator chains up to 5 AI calls
});

// ── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ───────────────────────────────
api.interceptors.response.use(
  // Pass successful responses through unchanged
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all auth state — the JWT has expired or been invalidated
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Only redirect if not already on the login page to avoid redirect loops
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
