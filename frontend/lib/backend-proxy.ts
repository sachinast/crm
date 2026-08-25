import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, getAccessToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const isProd = process.env.NODE_ENV === "production";

async function attemptBackendRefresh(): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) return null;

    const resp = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  } catch {
    return null;
  }
}

function applyRefreshedCookies(response: NextResponse, refreshed: { accessToken: string; refreshToken?: string }) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  if (refreshed.refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }
}

/**
 * Shared body for API route handlers that forwards a request to FastAPI
 * with the bearer token pulled from the session cookie.
 * If expired (401), automatically attempts silent refresh and retries once.
 */
export async function proxyToBackend(
  path: string,
  init: (RequestInit & { search?: URLSearchParams }) = {},
): Promise<NextResponse> {
  let token = await getAccessToken();
  let refreshedTokens: { accessToken: string; refreshToken?: string } | null = null;

  if (!token) {
    refreshedTokens = await attemptBackendRefresh();
    if (refreshedTokens) {
      token = refreshedTokens.accessToken;
    } else {
      return NextResponse.json({ error: "Not authenticated", detail: "Not authenticated" }, { status: 401 });
    }
  }

  const { search, headers, ...rest } = init;
  const query = search && search.toString() ? `?${search.toString()}` : "";
  const targetUrl = `${API_BASE_URL}${path}${query}`;

  try {
    let resp = await fetch(targetUrl, {
      ...rest,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...headers },
      cache: "no-store",
    });

    // Auto-refresh and retry once on 401
    if (resp.status === 401 && !refreshedTokens) {
      refreshedTokens = await attemptBackendRefresh();
      if (refreshedTokens) {
        token = refreshedTokens.accessToken;
        resp = await fetch(targetUrl, {
          ...rest,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...headers },
          cache: "no-store",
        });
      }
    }

    if (resp.status === 204) {
      const response = new NextResponse(null, { status: 204 });
      if (refreshedTokens) applyRefreshedCookies(response, refreshedTokens);
      return response;
    }

    const rawText = await resp.text();
    let body: unknown = null;

    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = {
          detail: rawText,
          error: rawText,
          status: resp.status,
        };
      }
    } else {
      body = {
        detail: resp.statusText || `Backend returned status ${resp.status}`,
        error: resp.statusText || `Backend returned status ${resp.status}`,
      };
    }

    if (!resp.ok) {
      console.error(`[backend-proxy] Error ${resp.status} from ${targetUrl}:`, body);
    }

    const response = NextResponse.json(body, { status: resp.status });
    if (refreshedTokens) applyRefreshedCookies(response, refreshedTokens);
    return response;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[backend-proxy] Network failure contacting backend at ${targetUrl}:`, err);
    return NextResponse.json(
      {
        error: `Failed to connect to backend server: ${errMsg}`,
        detail: `Failed to connect to backend server: ${errMsg}`,
        url: targetUrl,
      },
      { status: 502 },
    );
  }
}
