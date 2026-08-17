import type { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  return proxyToBackend("/future-credits", { search: request.nextUrl.searchParams });
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/future-credits", { method: "POST", body });
}
