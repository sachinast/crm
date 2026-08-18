import { ShieldCheck } from "lucide-react";
import Link from "next/link";

// Auditor QC queue: Tag to Auditor -> QC Done (PRD §4 status engine). The
// actual transition happens via the Lead detail page's StatusActions panel;
// this placeholder orients Auditors there until a dedicated queue view is
// built. (The Admin-only audit trail lives at /admin/audit — a different page.)
export default function AuditPage() {
  return (
    <div className="card flex max-w-xl flex-col items-start gap-3 text-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
        <ShieldCheck size={18} style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <h1 className="text-lg font-semibold">QC queue</h1>
        <p className="mt-1" style={{ color: "var(--ink-muted)" }}>
          Quality-check actions live on each lead&apos;s detail page. Open{" "}
          <Link href="/leads" className="underline" style={{ color: "var(--accent)" }}>
            Leads
          </Link>{" "}
          to find records tagged &ldquo;Tag Auditor.&rdquo;
        </p>
      </div>
    </div>
  );
}
