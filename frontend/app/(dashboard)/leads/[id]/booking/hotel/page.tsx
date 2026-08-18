import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

import HotelBookingForm from "./HotelBookingForm";

interface Lead {
  id: string;
  name: string;
  service_type: string | null;
}

interface HotelBooking {
  booking_reference: string;
  booking_platform: string;
  hotel_name: string;
  room_type: string;
  location: string;
  check_in_date: string;
  check_out_date: string;
  prepaid_amount: number;
  pay_at_counter_amount: number;
  total_amount: number;
}

export default async function HotelBookingPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (lead.service_type !== "hotel") {
    redirect(`/leads/${id}`);
  }

  let existing: HotelBooking | null = null;
  try {
    existing = await apiFetch<HotelBooking>(`/leads/${id}/hotel-booking`, { token });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  return (
    <div className="max-w-2xl">
      <Link href={`/leads/${id}`} className="link-muted text-sm">
        ← {lead.name}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight">Hotel booking</h1>
      <HotelBookingForm leadId={id} initial={existing} />
    </div>
  );
}
