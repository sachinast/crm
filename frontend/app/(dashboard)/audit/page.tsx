import { ShieldCheck } from "lucide-react";
import Link from "next/link";

// Auditor QC queue: Tag to Auditor -> QC Done (PRD §4 status engine). The
// actual transition happens via the Lead detail page's StatusActions panel;
// this placeholder orients Auditors there until a dedicated queue view is
// built. (The Admin-only audit trail lives at /admin/audit — a different page.)
export default function AuditPage() {
  return (
    <div className="card flex max-w-xl flex-col items-start gap-4 text-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <ShieldCheck size={20} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-ink">QC Queue</h1>
        <p className="mt-1.5 text-ink-muted">
          Quality-check actions live on each lead&apos;s detail page. Open{" "}
          <Link href="/leads" className="font-semibold underline text-accent hover:opacity-80">
            Leads
          </Link>{" "}
          to find records tagged &ldquo;Tag Auditor.&rdquo;
        </p>
      </div>
    </div>
  );
}
