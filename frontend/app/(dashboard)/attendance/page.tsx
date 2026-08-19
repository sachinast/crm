import { Clock } from "lucide-react";

import AttendanceManager from "@/components/attendance/AttendanceManager";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function AttendancePage() {
  const user = await getCurrentUser();
  const canViewAll = hasPermission(user, "attendance.view_all");

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <Clock size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Check in and out, and review attendance history.
          </p>
        </div>
      </div>

      <AttendanceManager canViewAll={canViewAll} />
    </div>
  );
}
