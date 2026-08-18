import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

import FlightBookingForm from "./FlightBookingForm";

interface Lead {
  id: string;
  name: string;
  service_type: string | null;
}

interface FlightBooking {
  booking_reference: string;
  pnr: string;
  airline: string;
  flight_numbers: string[];
  origin: string;
  destination: string;
  cabin_class: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
  total_amount: number;
}

export default async function FlightBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getAccessToken();
  if (!token) notFound();

  let lead: Lead;
  try {
    lead = await apiFetch<Lead>(`/leads/${id}`, { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  if (lead.service_type !== "flight") {
    redirect(`/leads/${id}`);
  }

  let existing: FlightBooking | null = null;
  try {
    existing = await apiFetch<FlightBooking>(`/leads/${id}/flight-booking`, { token });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  return (
    <div className="max-w-2xl">
      <Link href={`/leads/${id}`} className="link-muted text-sm">
        ← {lead.name}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight">Flight booking</h1>
      <FlightBookingForm leadId={id} initial={existing} />
    </div>
  );
}
