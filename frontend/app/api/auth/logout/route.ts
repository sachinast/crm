import { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth";

export async function POST() {
  // Stateless JWT backend for now (TECHNICAL_SPEC.md §10 Phase 9 covers
  // server-side revocation) — logging out just drops the cookies.
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  return response;
}
