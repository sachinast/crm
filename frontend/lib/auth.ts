import { cookies } from "next/headers";

import { apiFetch } from "@/lib/api-client";

/**
 * Cookie names shared between the login/logout route handlers (which set/clear
 * them) and everything that reads them (dashboard layout, admin proxy routes).
 * httpOnly + secure-in-prod — tokens never touch client-side JS, only Next's
 * own server-side route handlers/Server Components. See TECHNICAL_SPEC.md §8.
 */
export const ACCESS_TOKEN_COOKIE = "crm_access_token";
export const REFRESH_TOKEN_COOKIE = "crm_refresh_token";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  ip_whitelist_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

/** Validates the session against the backend (not just cookie presence) — the
 * backend is the actual authority on whether the token is still good. Returns
 * null on any failure (expired token, backend down, user deactivated, ...). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiFetch<CurrentUser>("/users/me", { token });
  } catch {
    return null;
  }
}

export function isAdminRole(role: string): boolean {
  return role === "admin" || role === "super_admin";
}
