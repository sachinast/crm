import { CreditCard } from "lucide-react";
import Link from "next/link";

// Billing queue: Transferred to Billing -> Card Charged/Declined (PRD §5).
// The actual charge/decline action lives on the Lead detail page's
// PaymentActions panel — this placeholder just orients Billing staff there
// until a dedicated queue view is built.
export default function BillingPage() {
  return (
    <div className="card flex max-w-xl flex-col items-start gap-4 text-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <CreditCard size={20} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-ink">Billing Queue</h1>
        <p className="mt-1.5 text-ink-muted">
          Card charge/decline actions live on each lead&apos;s detail page. Open{" "}
          <Link href="/leads" className="font-semibold underline text-accent hover:opacity-80">
            Leads
          </Link>{" "}
          to find records tagged &ldquo;Transferred to Billing.&rdquo;
        </p>
      </div>
    </div>
  );
}
