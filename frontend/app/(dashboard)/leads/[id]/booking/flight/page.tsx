import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plane, ChevronLeft } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import FlightBookingForm from "./FlightBookingForm";
import type { FlightBookingValue } from "@/components/booking/FlightBookingFields";

interface Lead {
  id: string;
  name: string;
  service_type: string | null;
}

type FlightBooking = FlightBookingValue & { total_amount: number };

export default async function FlightBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getAccessToken();
  if (!token) notFound();

  const currentUser = await getCurrentUser();
  const role = (currentUser?.role || "").toLowerCase();
  const isAgentOrAdmin =
    role === "admin" || role === "super_admin" || role === "superadmin" || role === "agent";
  const readOnly = !isAgentOrAdmin;

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
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Flight Ticket Booking"
        subtitle={`Configure PNR, itinerary segments, fare breakdown, and traveler roster for ${lead.name || "Customer"}.`}
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: lead.name || "Lead Details", href: `/leads/${id}` },
          { label: "Flight Booking" },
        ]}
        icon={<Plane size={18} />}
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
      <FlightBookingForm leadId={id} initial={existing} readOnly={readOnly} />
    </div>
  );
}
