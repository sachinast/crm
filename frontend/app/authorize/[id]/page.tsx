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

export default async function AuthorizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { summary, error } = await fetchSummary(id);

  if (!summary) {
    return (
      <main className="mx-auto max-w-lg p-8 text-center text-sm text-neutral-500">
        <p>{error}</p>
      </main>
    );
  }

  if (summary.status !== "authorization_pending") {
    return (
      <main className="mx-auto max-w-lg p-8 text-center text-sm text-neutral-500">
        <p>This booking has already been processed — no further action is needed.</p>
      </main>
    );
  }

  const highlights = HIGHLIGHT_FIELDS[summary.service_type] ?? [];

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-1 text-xl font-semibold">Confirm your booking</h1>
      <p className="mb-6 text-sm text-neutral-500">Hi {summary.customer_name}, please review the details below.</p>

      <div className="mb-4 rounded-lg border p-4 text-sm">
        <h2 className="mb-2 font-medium capitalize">{summary.service_type} booking</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          {highlights.map((f) => (
            <div key={f.key} className="contents">
              <dt className="text-neutral-500">{f.label}</dt>
              <dd>{String(summary.booking[f.key] ?? "—")}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mb-4 rounded-lg border p-4 text-sm">
        <h2 className="mb-2 font-medium">Payment breakdown</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-neutral-500">Prepaid amount</dt>
          <dd>${Number(summary.booking.prepaid_amount).toFixed(2)}</dd>
          <dt className="text-neutral-500">Pay at counter</dt>
          <dd>${Number(summary.booking.pay_at_counter_amount).toFixed(2)}</dd>
          <dt className="font-medium">Total</dt>
          <dd className="font-medium">${Number(summary.booking.total_amount).toFixed(2)}</dd>
        </dl>
      </div>

      <AuthorizeForm leadId={id} />
    </main>
  );
}
