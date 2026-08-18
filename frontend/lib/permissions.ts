import type { CurrentUser } from "@/lib/auth";

/** True if the user holds ANY of the given permission codes — same "any of
 * these" semantics as the backend's require_permission(*codes). See
 * app/domain/permissions.py (backend) for the canonical code catalog. */
export function hasPermission(user: Pick<CurrentUser, "permissions"> | null, ...codes: string[]): boolean {
  if (!user) return false;
  return codes.some((code) => user.permissions.includes(code));
}
