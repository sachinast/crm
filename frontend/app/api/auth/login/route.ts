import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const isProd = process.env.NODE_ENV === "production";

/**
 * Proxies to FastAPI's POST /auth/login and, on success, stores the returned
 * JWTs as httpOnly cookies instead of handing them to client JS — see
 * TECHNICAL_SPEC.md §8.
 */
export async function POST(request: Request) {
  const credentials = await request.json();

  const backendResp = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!backendResp.ok) {
    const detail = await backendResp.json().catch(() => ({ detail: backendResp.statusText }));
    return NextResponse.json({ error: detail.detail ?? "Invalid email or password" }, { status: backendResp.status });
  }

  const { access_token, refresh_token } = await backendResp.json();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_TOKEN_COOKIE, access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // matches backend JWT_ACCESS_TTL_MIN default
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // matches backend JWT_REFRESH_TTL_DAYS default
  });
  return response;
}
