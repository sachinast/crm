import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Car, ChevronLeft } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
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
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Car Rental Booking"
        subtitle={`Configure vehicle reservation, driver credentials, and rate breakdown for ${lead.name || "Customer"}.`}
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: lead.name || "Lead Details", href: `/leads/${id}` },
          { label: "Car Rental Booking" },
        ]}
        icon={<Car size={18} />}
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
      <CarBookingForm leadId={id} initial={existing} readOnly={readOnly} />
    </div>
  );
}
