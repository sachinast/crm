import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

/**
 * Shared body for API route handlers that just forward a request to FastAPI
 * with the bearer token pulled from the httpOnly session cookie, and relay
 * the backend's status code + JSON body back verbatim. Used by client
 * components that can't hold the token themselves (see TECHNICAL_SPEC.md §8) —
 * server components fetch the backend directly with apiFetch instead, since
 * they already have server-side access to the cookie.
 */
export async function proxyToBackend(
  path: string,
  init: (RequestInit & { search?: URLSearchParams }) = {},
): Promise<NextResponse> {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { search, headers, ...rest } = init;
  const query = search && search.toString() ? `?${search.toString()}` : "";
  const resp = await fetch(`${API_BASE_URL}${path}${query}`, {
    ...rest,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...headers },
    cache: "no-store",
  });

  // A 204 (e.g. DELETE /admin/roles/{id}) has no body — constructing a
  // NextResponse.json() with one throws ("Response with null body status
  // cannot have body"), which without this check surfaces as an opaque 500
  // to the client instead of the backend's real 204.
  if (resp.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await resp.json().catch(() => null);
  return NextResponse.json(body, { status: resp.status });
}
