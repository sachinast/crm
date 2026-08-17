import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/auth";

/**
 * The WebSocket endpoint authenticates via a `?token=` query param (browsers
 * can't set custom headers on a WS handshake), so the client needs *some*
 * access to the access token — which otherwise never leaves the httpOnly
 * session cookie (TECHNICAL_SPEC.md §8). This hands back the same short-lived
 * (15 min) token already sitting in that cookie, scoped to this one purpose:
 * held in memory by the WS hook, never written to storage. It's the same
 * trust boundary as every other authenticated fetch this app makes — the
 * difference is only that the browser, not this server, holds it briefly.
 */
export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ token });
}
