import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

/**
 * Same-origin proxy for the admin user-provisioning UI (Phase 1). Keeps the
 * bearer token server-side (pulled from the httpOnly cookie) instead of
 * exposing it to the client component that renders the create-user form.
 * The backend is still the actual authority — this just forwards the call
 * and its status code.
 */
export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const resp = await fetch(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await resp.json();
  return NextResponse.json(body, { status: resp.status });
}

export async function POST(request: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const payload = await request.json();
  const resp = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await resp.json();
  return NextResponse.json(body, { status: resp.status });
}
