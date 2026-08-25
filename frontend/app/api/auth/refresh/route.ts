import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const isProd = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    // Check if refresh_token was provided in request body (e.g. from localStorage)
    if (!refreshToken) {
      try {
        const body = await request.json().catch(() => ({}));
        refreshToken = body.refresh_token || body.refreshToken;
      } catch {
        // No body provided
      }
    }

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token available", detail: "No refresh token available" }, { status: 401 });
    }

    const backendResp = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!backendResp.ok) {
      const errData = await backendResp.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.detail ?? "Token refresh failed", detail: errData.detail ?? "Token refresh failed" },
        { status: backendResp.status },
      );
    }

    const { access_token, refresh_token: newRefreshToken } = await backendResp.json();

    const response = NextResponse.json({
      ok: true,
      access_token,
      refresh_token: newRefreshToken || refreshToken,
    });

    response.cookies.set(ACCESS_TOKEN_COOKIE, access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    if (newRefreshToken) {
      response.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Token refresh error" },
      { status: 500 },
    );
  }
}
