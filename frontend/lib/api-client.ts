/**
 * Typed fetch wrapper for the FastAPI backend (see TECHNICAL_SPEC.md §5 for the full
 * endpoint contract, §9.4 for the OpenAPI-driven type generation this will eventually
 * replace the hand-written `ApiError`/generic below).
 *
 * Server Components / Route Handlers call this directly; it forwards the bearer token
 * once auth (Phase 1) is wired in.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new ApiError(res.status, detail || res.statusText);
  }

  return res.json() as Promise<T>;
}
