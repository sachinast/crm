import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const isProd = process.env.NODE_ENV === "production";

/**
 * Proxies to FastAPI's POST /auth/login and stores the returned
 * JWTs as httpOnly cookies while returning the user profile to client JS.
 */
export async function POST(request: Request) {
  try {
    const credentials = await request.json();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

    const userAgent = request.headers.get("user-agent");
    if (userAgent) headers["User-Agent"] = userAgent;

    const backendResp = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify(credentials),
    });

    if (!backendResp.ok) {
      const detail = await backendResp.json().catch(() => ({ detail: backendResp.statusText }));
      return NextResponse.json(
        { error: detail.detail ?? "Invalid email or password" },
        { status: backendResp.status },
      );
    }

    const { access_token, refresh_token } = await backendResp.json();

    const response = NextResponse.json({
      ok: true,
      access_token,
    });

    // Set secure httpOnly cookies
    response.cookies.set(ACCESS_TOKEN_COOKIE, access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    response.cookies.set(REFRESH_TOKEN_COOKIE, refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error("[Login API Route Error]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Authentication service unavailable" },
      { status: 500 },
    );
  }
}
