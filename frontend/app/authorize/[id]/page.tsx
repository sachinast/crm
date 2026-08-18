import { CreditCard, FileCheck } from "lucide-react";

import AuthorizeForm from "./AuthorizeForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface Summary {
  lead_id: string;
  customer_name: string;
  service_type: string;
  status: string;
  booking: Record<string, unknown>;
}

async function fetchSummary(id: string): Promise<{ summary: Summary | null; error: string | null }> {
  const resp = await fetch(`${API_BASE_URL}/leads/${id}/authorization-summary`, { cache: "no-store" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    return { summary: null, error: typeof body.detail === "string" ? body.detail : "This link is invalid or has expired." };
  }
  return { summary: await resp.json(), error: null };
}

const HIGHLIGHT_FIELDS: Record<string, { key: string; label: string }[]> = {
  car: [
    { key: "car_provider", label: "Provider" },
    { key: "vehicle_type", label: "Vehicle type" },
    { key: "pickup_datetime", label: "Pick-up" },
    { key: "pickup_location", label: "Pick-up location" },
    { key: "return_datetime", label: "Return" },
    { key: "return_location", label: "Return location" },
  ],
  hotel: [
    { key: "hotel_name", label: "Hotel" },
    { key: "room_type", label: "Room type" },
    { key: "check_in_date", label: "Check-in" },
    { key: "check_out_date", label: "Check-out" },
  ],
  flight: [
    { key: "airline", label: "Airline" },
    { key: "flight_numbers", label: "Flight(s)" },
    { key: "origin", label: "From" },
    { key: "destination", label: "To" },
    { key: "cabin_class", label: "Cabin" },
  ],
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen justify-center p-6 sm:p-10"
      style={{
        background:
          "radial-gradient(circle at 20% 10%, rgba(179,135,47,0.10), transparent 45%), radial-gradient(circle at 85% 90%, rgba(18,23,43,0.06), transparent 50%), var(--background)",
      }}
    >
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
            style={{ background: "var(--navy)", color: "var(--accent)" }}
          >
            T
          </div>
          <span className="text-sm font-semibold tracking-tight">Travel CRM</span>
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function AuthorizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { summary, error } = await fetchSummary(id);

  if (!summary) {
    return (
      <Shell>
        <div className="card text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          <p>{error}</p>
        </div>
      </Shell>
    );
  }

  if (summary.status !== "authorization_pending") {
    return (
      <Shell>
        <div className="card text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          <p>This booking has already been processed — no further action is needed.</p>
        </div>
      </Shell>
    );
  }

  const highlights = HIGHLIGHT_FIELDS[summary.service_type] ?? [];

  return (
    <Shell>
      <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Confirm your booking</h1>
      <p className="mb-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
        Hi {summary.customer_name}, please review the details below.
      </p>

      <div className="card mb-4 text-sm">
        <h2 className="section-label mb-3 flex items-center gap-1.5">
          <FileCheck size={13} />
          <span className="capitalize">{summary.service_type} booking</span>
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {highlights.map((f) => (
            <div key={f.key} className="contents">
              <dt style={{ color: "var(--ink-faint)" }}>{f.label}</dt>
              <dd>{String(summary.booking[f.key] ?? "—")}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card mb-4 text-sm">
        <h2 className="section-label mb-3 flex items-center gap-1.5">
          <CreditCard size={13} />
          Payment breakdown
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <dt style={{ color: "var(--ink-faint)" }}>Prepaid amount</dt>
          <dd>${Number(summary.booking.prepaid_amount).toFixed(2)}</dd>
          <dt style={{ color: "var(--ink-faint)" }}>Pay at counter</dt>
          <dd>${Number(summary.booking.pay_at_counter_amount).toFixed(2)}</dd>
          <dt className="font-medium">Total</dt>
          <dd className="font-medium">${Number(summary.booking.total_amount).toFixed(2)}</dd>
        </dl>
      </div>

      <AuthorizeForm leadId={id} />
    </Shell>
  );
}
