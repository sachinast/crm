import { Clock } from "lucide-react";

import AttendanceManager from "@/components/attendance/AttendanceManager";
import PageHeader from "@/components/shared/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function AttendancePage() {
  const user = await getCurrentUser();
  const canViewAll = hasPermission(user, "attendance.view_all");

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Staff Attendance"
        subtitle="Daily agent clock-in/out tracking and working hours history."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Attendance" }]}
        icon={<Clock size={18} />}
      />

      <AttendanceManager canViewAll={canViewAll} />
    </div>
  );
}
