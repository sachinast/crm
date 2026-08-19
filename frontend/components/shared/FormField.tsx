"use client";

// The plain "label above input" wrapper every hand-built form in this app
// used to redefine locally (leads/new, CarBookingForm, HotelBookingForm,
// FlightBookingForm) — one definition instead of four copies.
export default function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
