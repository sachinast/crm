import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection stub. Phase 1 wires this to the session cookie set after
 * FastAPI login (see docs/TECHNICAL_SPEC.md §4/§8): redirect unauthenticated
 * requests for (dashboard) routes to /login.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
