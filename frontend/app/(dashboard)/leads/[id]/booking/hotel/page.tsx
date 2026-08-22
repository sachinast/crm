import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Hotel, ChevronLeft } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import HotelBookingForm from "./HotelBookingForm";
import type { HotelBookingValue } from "@/components/booking/HotelBookingFields";

interface Lead {
  id: string;
  name: string;
  service_type: string | null;
}

type HotelBooking = HotelBookingValue & { total_amount: number };

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
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Hotel Reservation Booking"
        subtitle={`Configure property stay, room preferences, and guest details for ${lead.name || "Customer"}.`}
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: lead.name || "Lead Details", href: `/leads/${id}` },
          { label: "Hotel Booking" },
        ]}
        icon={<Hotel size={18} />}
        actions={
          <Link
            href={`/leads/${id}`}
            className="btn-secondary flex items-center gap-1 text-xs py-2 px-3.5"
          >
            <ChevronLeft size={14} />
            <span>Back to Lead</span>
          </Link>
        }
      />
      <HotelBookingForm leadId={id} initial={existing} />
    </div>
  );
}
