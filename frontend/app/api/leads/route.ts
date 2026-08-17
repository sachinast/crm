import { proxyToBackend } from "@/lib/backend-proxy";

// POST is the only handler the client-side new-lead flow needs (leads/new/page.tsx
// is a client component and can't hold the httpOnly session token itself). The
// list view is a Server Component (leads/page.tsx) that fetches the backend
// directly, so no GET proxy here.
export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/leads", { method: "POST", body });
}
