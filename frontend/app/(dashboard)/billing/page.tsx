import { CreditCard } from "lucide-react";
import Link from "next/link";

// Billing queue: Transferred to Billing -> Card Charged/Declined (PRD §5).
// The actual charge/decline action lives on the Lead detail page's
// PaymentActions panel — this placeholder just orients Billing staff there
// until a dedicated queue view is built.
export default function BillingPage() {
  return (
    <div className="card flex max-w-xl flex-col items-start gap-3 text-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
        <CreditCard size={18} style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Billing queue</h1>
        <p className="mt-1" style={{ color: "var(--ink-muted)" }}>
          Card charge/decline actions live on each lead&apos;s detail page. Open{" "}
          <Link href="/leads" className="underline" style={{ color: "var(--accent)" }}>
            Leads
          </Link>{" "}
          to find records tagged &ldquo;Transferred to Billing.&rdquo;
        </p>
      </div>
    </div>
  );
}
