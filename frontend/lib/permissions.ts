import type { CurrentUser } from "@/lib/auth";

/** True if the user holds ANY of the given permission codes — same "any of
 * these" semantics as the backend's require_permission(*codes). See
 * app/domain/permissions.py (backend) for the canonical code catalog.
 *
 * Defensive against `permissions` being missing/non-array: this field only
 * exists on GET /users/me as of this feature — a version-skew deploy (this
 * frontend live against an older backend that hasn't redeployed yet) would
 * otherwise crash every page that calls this, since it's read from the
 * dashboard layout on every request.
 */
export function hasPermission(user: Pick<CurrentUser, "permissions"> | null, ...codes: string[]): boolean {
  if (!user || !Array.isArray(user.permissions)) return false;
  return codes.some((code) => user.permissions.includes(code));
}
