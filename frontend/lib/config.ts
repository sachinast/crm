/**
 * Centralized API & WebSocket URLs configuration.
 *
 * Provides safe, robust fallbacks for both production and development environments
 * even if environment variables are not set or passed as empty strings.
 */

export const API_BASE_URL =
  typeof process !== "undefined" &&
  process.env.INTERNAL_API_URL &&
  process.env.INTERNAL_API_URL.trim() !== ""
    ? process.env.INTERNAL_API_URL.trim().replace(/\/+$/, "")
    : typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_API_BASE_URL &&
      process.env.NEXT_PUBLIC_API_BASE_URL.trim() !== ""
      ? process.env.NEXT_PUBLIC_API_BASE_URL.trim().replace(/\/+$/, "")
      : typeof process !== "undefined" && process.env.NODE_ENV === "production"
        ? "https://crm.webflowby.online/api/v1"
        : "http://localhost:8000/api/v1";

export const WS_BASE_URL =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_WS_URL &&
  process.env.NEXT_PUBLIC_WS_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_WS_URL.trim().replace(/\/+$/, "")
    : typeof process !== "undefined" && process.env.NODE_ENV === "production"
      ? "wss://crm.webflowby.online/ws"
      : "ws://localhost:8000/ws";
