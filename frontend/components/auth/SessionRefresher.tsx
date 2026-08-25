"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * SessionRefresher & Auto-Token Keeper:
 * - Maintains active session in browser localStorage + cookies.
 * - Proactively refreshes JWT access token before expiration (every 5 minutes or on tab focus).
 * - Automatically regenerates fresh access token if expired using the stored refresh token.
 * - Intercepts 401 Unauthorized API responses to silently refresh and retry requests.
 */
export default function SessionRefresher() {
  const router = useRouter();
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // Proactive refresh interval: 5 minutes
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

    async function executeTokenRefresh(): Promise<boolean> {
      if (isRefreshingRef.current) return false;
      isRefreshingRef.current = true;

      try {
        const storedRefreshToken =
          typeof window !== "undefined"
            ? localStorage.getItem("crm_refresh_token")
            : null;

        const resp = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refresh_token: storedRefreshToken || undefined,
          }),
        });

        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          if (typeof window !== "undefined") {
            if (data.access_token) {
              localStorage.setItem("crm_access_token", data.access_token);
            }
            if (data.refresh_token) {
              localStorage.setItem("crm_refresh_token", data.refresh_token);
            }
          }
          return true;
        } else if (resp.status === 401) {
          // Both access and refresh tokens expired or revoked
          if (typeof window !== "undefined") {
            localStorage.removeItem("crm_access_token");
            localStorage.removeItem("crm_refresh_token");
          }
          // Redirect if on protected dashboard route
          if (
            typeof window !== "undefined" &&
            (window.location.pathname.startsWith("/dashboard") ||
              window.location.pathname.startsWith("/leads") ||
              window.location.pathname.startsWith("/admin"))
          ) {
            router.push("/login");
          }
          return false;
        }
      } catch (err) {
        console.debug("[SessionRefresher] Refresh attempt failed:", err);
      } finally {
        isRefreshingRef.current = false;
      }
      return false;
    }

    // 1. Initial check & refresh on mount if refresh token exists in localStorage
    if (typeof window !== "undefined" && localStorage.getItem("crm_refresh_token")) {
      executeTokenRefresh();
    }

    // 2. Periodic background refresh timer
    const timer = setInterval(() => {
      executeTokenRefresh();
    }, REFRESH_INTERVAL_MS);

    // 3. Tab Visibility / Focus listener (refresh when returning to tab after sleep/idle)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        executeTokenRefresh();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // 4. Global Fetch 401 Interceptor: Catch 401s, auto-regenerate token with old refresh token, and retry
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";

      // If protected API request fails with 401 (and not already calling auth endpoints)
      if (
        response.status === 401 &&
        !url.includes("/api/auth/login") &&
        !url.includes("/api/auth/refresh") &&
        !url.includes("/api/auth/logout")
      ) {
        const refreshed = await executeTokenRefresh();
        if (refreshed) {
          // Retry the original request once with fresh cookie/tokens
          return originalFetch(...args);
        }
      }

      return response;
    };

    return () => {
      clearInterval(timer);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.fetch = originalFetch;
    };
  }, [router]);

  return null;
}
