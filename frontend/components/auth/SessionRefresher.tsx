"use client";

import { useEffect } from "react";

/**
 * SessionRefresher:
 * Silently refreshes the user's JWT access token periodically
 * and synchronizes token storage across cookies and localStorage.
 */
export default function SessionRefresher() {
  useEffect(() => {
    // Refresh every 10 minutes (access token validity is 15 minutes)
    const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

    async function doSilentRefresh() {
      try {
        const resp = await fetch("/api/auth/refresh", { method: "POST" });
        if (resp.ok) {
          const data = await resp.json();
          if (data.access_token && typeof window !== "undefined") {
            localStorage.setItem("crm_access_token", data.access_token);
          }
        }
      } catch (e) {
        console.debug("[SessionRefresher] Background refresh failed:", e);
      }
    }

    const timer = setInterval(doSilentRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return null;
}
