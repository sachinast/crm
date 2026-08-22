import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

import CarBookingForm from "./CarBookingForm";
import type { CarBookingValue } from "@/components/booking/CarBookingFields";

interface Lead {
  id: string;
  name: string;
  service_type: string | null;
}

type CarBooking = CarBookingValue & { total_amount: number };

export default async function CarBookingPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (lead.service_type !== "car") {
    redirect(`/leads/${id}`);
  }

  let existing: CarBooking | null = null;
  try {
    existing = await apiFetch<CarBooking>(`/leads/${id}/car-booking`, { token });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  return (
    <div className="max-w-2xl">
      <Link href={`/leads/${id}`} className="link-muted text-sm">
        ← {lead.name}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight">Car rental booking</h1>
      <CarBookingForm leadId={id} initial={existing} />
    </div>
  );
}
