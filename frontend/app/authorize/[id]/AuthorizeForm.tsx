"use client";

import { CheckCircle2, PhoneCall, ShieldCheck, Tag, Ticket } from "lucide-react";
import { useState, type FormEvent } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface ConsentState {
  cardholder_confirmed: boolean;
  prepaid_charge_ack: boolean;
  pay_at_counter_ack: boolean;
  booking_details_ack: boolean;
  terms_ack: boolean;
  non_refundable_ack: boolean;
}

const CONSENT_ITEMS: { key: keyof ConsentState; label: string }[] = [
  { key: "cardholder_confirmed", label: "I am the authorized holder of the payment card provided." },
  { key: "prepaid_charge_ack", label: "I authorize E-Booking Desk to charge the prepaid amount for my reservation." },
  { key: "pay_at_counter_ack", label: "I understand the Pay at Counter amount is payable directly at pickup/arrival." },
  { key: "booking_details_ack", label: "I have reviewed and approved the reservation details and itinerary." },
  { key: "terms_ack", label: "I authorize E-Booking Desk to complete my reservation with the selected supplier." },
  { key: "non_refundable_ack", label: "I agree to all rental terms, conditions, and cancellation policies." },
];

const INITIAL_STATE: ConsentState = {
  cardholder_confirmed: true,
  prepaid_charge_ack: true,
  pay_at_counter_ack: true,
  booking_details_ack: true,
  terms_ack: true,
  non_refundable_ack: true,
};

export default function AuthorizeForm({
  leadId,
  bookingRef,
  serviceTitle = "Car",
}: {
  leadId: string;
  bookingRef: string;
  serviceTitle?: string;
}) {
  const [consent, setConsent] = useState<ConsentState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const allChecked = Object.values(consent).every(Boolean);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`${API_BASE_URL}/leads/${leadId}/authorization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consent),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
        setError(detail ?? "Unable to record authorization. Please try again or contact support.");
        setSubmitting(false);
        return;
      }

      setConfirmed(true);
    } catch (err) {
      setError("Network error while submitting authorization. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  // If confirmed, render the exact Screenshot 1 Thank You acknowledgment screen!
  if (confirmed) {
    return (
      <div className="space-y-6 pt-2">
        <div className="text-center py-2">
          <h1 className="text-3xl font-black text-[#0f4c81] tracking-tight">Thank You!</h1>
          <p className="text-base text-slate-700 font-semibold mt-1">
            For Confirming Your <span className="text-[#ea580c]">{serviceTitle}</span> Booking
          </p>
        </div>

        {/* Section 1: Booking Status */}
        <div className="border border-[#0f4c81] rounded-md overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2">
            <Tag size={15} />
            <span>Booking Status</span>
          </div>
          <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-white">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="font-extrabold text-[#ea580c] text-sm tracking-wide uppercase">
                  YOUR BOOKING IS COMPLETE!!
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">
                  Thank you for booking with us.
                </div>
                <div className="text-xs text-slate-500">
                  You will soon receive an email confirmation for your e-ticket.
                </div>
              </div>
            </div>
            <div className="border border-[#cbd5e1] rounded bg-[#f8fafc] px-4 py-2.5 text-xs text-center shrink-0">
              <span className="text-slate-600 font-semibold">Booking Reference No.: </span>
              <span className="font-bold text-[#ea580c] text-sm">{bookingRef}</span>
            </div>
          </div>
        </div>

        {/* Section 2: e-Ticket Status */}
        <div className="border border-[#0f4c81] rounded-md overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2">
            <Ticket size={15} />
            <span>e-Ticket Status</span>
          </div>
          <div className="p-5 space-y-3 bg-white">
            <div className="font-extrabold text-[#ea580c] text-sm tracking-wide">
              Your payment has been Submitted....!
            </div>
            <p className="text-xs text-[#991b1b] font-medium leading-relaxed">
              Your e-Ticket will be emailed within 48-72 hours to your email address, once your credit card verification has been completed.
            </p>
            <div className="bg-[#fffbeb] border border-[#fef08a] rounded p-2.5 text-[11px] font-bold text-slate-800 tracking-tight">
              NOTE: THIS IS NOT YOUR E-TICKET AND IS NOT VALID FOR TRAVEL..
            </div>
          </div>
        </div>

        {/* Section 3: Customer Support */}
        <div className="border border-[#0f4c81] rounded-md overflow-hidden">
          <div className="bg-[#0f4c81] text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2">
            <PhoneCall size={15} />
            <span>Customer Support</span>
          </div>
          <div className="p-5 text-xs text-slate-700 space-y-2 bg-white">
            <div>
              <strong>Booking Number:</strong> {bookingRef}
            </div>
            <p className="text-slate-500">
              If you have questions about your reservation, please contact us and we will respond within 24 hours.
            </p>
            <div className="pt-2 border-t border-slate-100 font-semibold text-slate-800">
              For immediate assistance please call:
              <div className="text-slate-500 font-normal">To make changes to your ticketed reservation</div>
              <div className="text-[#0f4c81] font-bold text-sm mt-0.5">Customer Service — +1 (877) 362-2838</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-[#cbd5e1] rounded-md p-4 bg-[#ffffff] space-y-2.5">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Customer Acknowledgment &amp; Consent
        </div>
        {CONSENT_ITEMS.map((item) => (
          <label key={item.key} className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consent[item.key]}
              onChange={(e) => setConsent({ ...consent, [item.key]: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded accent-[#ea580c]"
            />
            <span className="leading-snug">{item.label}</span>
          </label>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="text-center pt-2">
        <button
          type="submit"
          disabled={!allChecked || submitting}
          className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm rounded shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide cursor-pointer"
        >
          {submitting ? "Recording Authorization…" : "Acknowledge & Authorize"}
        </button>
        <p className="text-[11px] text-slate-400 mt-2">
          Electronic consent is recorded with timestamp, IP address, and browser audit trail.
        </p>
      </div>
    </form>
  );
}
