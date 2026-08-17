import { NextResponse, type NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "crm_access_token";

// Route groups like (dashboard) don't appear in the URL — these are the actual
// paths that need a session. This is a cheap cookie-presence check for UX
// (redirect before a protected page even starts rendering); the real
// authority is the backend, which every server component/route handler in
// this app re-validates against on each request (see lib/auth.ts, §8).
const PROTECTED_PREFIXES = ["/leads", "/billing", "/audit", "/admin", "/future-credits"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !request.cookies.has(ACCESS_TOKEN_COOKIE)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
