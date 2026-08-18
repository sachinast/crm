import type { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/messaging/conversations/${id}/messages`, { search: request.nextUrl.searchParams });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(`/messaging/conversations/${id}/messages`, { method: "POST", body });
}
