import type { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/backend-proxy";

// Directory search for starting a conversation / @mention autocomplete —
// open to any authenticated user server-side (see backend messaging.py),
// unlike GET /users which is Admin-only provisioning.
export async function GET(request: NextRequest) {
  return proxyToBackend("/messaging/users", { search: request.nextUrl.searchParams });
}
