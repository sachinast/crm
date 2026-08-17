import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

import CarBookingForm from "./CarBookingForm";

interface Lead {
  id: string;
  name: string;
  service_type: string | null;
}

interface CarBooking {
  booking_reference: string;
  booking_platform: string;
  car_provider: string;
  renter_name: string;
  renter_dob: string;
  transmission: string;
  fuel_policy: string | null;
  vehicle_type: string;
  pickup_datetime: string;
  pickup_location: string;
  return_datetime: string;
  return_location: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
  total_amount: number;
}

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
      <Link href={`/leads/${id}`} className="text-sm text-neutral-500 hover:underline">
        ← {lead.name}
      </Link>
      <h1 className="mb-6 mt-2 text-lg font-semibold">Car rental booking</h1>
      <CarBookingForm leadId={id} initial={existing} />
    </div>
  );
}
