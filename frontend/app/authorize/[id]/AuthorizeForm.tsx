"use client";

import { CheckCircle2, PhoneCall, Tag, Ticket, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+1 (877) 362-2838";
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "E-Booking Desk";

interface Summary {
  lead_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  service_type: string;
  status: string;
  booking: Record<string, unknown>;
}

function maskCardNumber(num: unknown): string {
  if (!num) return "**** **** **** ****";
  const str = String(num).replace(/\D/g, "");
  if (str.length >= 4) {
    return `**** **** **** ${str.slice(-4)}`;
  }
  return "**** **** **** ****";
}

function formatDateTime(str: unknown): string {
  if (!str) return "—";
  try {
    const d = new Date(String(str));
    if (isNaN(d.getTime())) return String(str);
    return (
      d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  } catch {
    return String(str);
  }
}

export default function AuthorizeForm({
  summary,
  bookingRef,
  serviceTitle = "Car",
}: {
  summary: Summary;
  bookingRef: string;
  serviceTitle?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [agreed, setAgreed] = useState(true);

  const b = summary.booking;
  const leadId = summary.lead_id;
  const customerName = summary.customer_name || "Customer";
  const customerEmail = summary.customer_email || String(b.email || b.contact_email || b.guest_email || "");
  const customerPhone = summary.customer_phone || String(b.phone || b.driver_phone || b.contact_phone || "—");
  const bookingPlatform = String(b.booking_platform || "Direct");
  const carProvider = String(b.car_provider || "Car Rental");
  const driverName = String(b.driver_name || customerName);

  const vehicleTypeRaw = String(b.vehicle_type || "economy");
  const vehicleType = vehicleTypeRaw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const carModel = String(b.car_model || "");
  const vehicleModel = carModel ? `${carModel} or Similar` : `${vehicleType} or Similar`;

  const pickupLocation = String(b.pickup_location || "");
  const returnLocation = String(b.return_location || "");
  const pickupDtRaw = b.pickup_datetime;
  const returnDtRaw = b.return_datetime;

  const pickupFormatted = formatDateTime(pickupDtRaw);
  const returnFormatted = formatDateTime(returnDtRaw);
  const pickupDisplay = pickupLocation ? `${pickupFormatted} — ${pickupLocation}` : pickupFormatted;
  const returnDisplay = returnLocation ? `${returnFormatted} — ${returnLocation}` : returnFormatted;

  let durationDisplay = "1 Day";
  if (pickupDtRaw && returnDtRaw) {
    try {
      const p = new Date(String(pickupDtRaw)).getTime();
      const r = new Date(String(returnDtRaw)).getTime();
      if (!isNaN(p) && !isNaN(r) && r > p) {
        const days = Math.max(1, Math.round((r - p) / (1000 * 60 * 60 * 24)));
        durationDisplay = `${days} ${days === 1 ? "Day" : "Days"}`;
      }
    } catch {}
  }

  const prepaidAmt = Number(b.prepaid_amount || 0);
  const counterAmt = Number(b.pay_at_counter_amount || 0);
  const totalAmt = Number(b.total_amount || prepaidAmt + counterAmt);

  async function handleAcknowledge(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!agreed) {
      setError("Please agree to the terms and conditions to authorize your booking.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const systemName =
      typeof navigator !== "undefined"
        ? (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
          navigator.platform ||
          navigator.userAgent
        : "Web Client";

    const consentPayload = {
      cardholder_confirmed: true,
      prepaid_charge_ack: true,
      pay_at_counter_ack: true,
      booking_details_ack: true,
      terms_ack: true,
      non_refundable_ack: true,
      system_name: systemName,
    };

    try {
      const resp = await fetch(`${API_BASE_URL}/leads/${leadId}/authorization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consentPayload),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
        setError(detail ?? "Could not record authorization. Please contact support.");
        setSubmitting(false);
        return;
      }

      setConfirmed(true);
    } catch {
      setError("Network error while submitting authorization. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // If confirmed, render the Thank You confirmation screen
  if (confirmed) {
    return (
      <div>
        {/* Header with Call Center info */}
        <div className="p-5 sm:p-6 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0f4c81] text-white flex items-center justify-center font-black text-lg shadow-xs">
              ED
            </div>
            <div>
              <div className="font-extrabold text-[#0f4c81] text-lg leading-tight">{BRAND_NAME}</div>
              <div className="text-[11px] text-slate-500">Customer Reservation Confirmation</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-700">Book Online or Call Us 24/7</div>
              <div className="text-xs font-bold text-[#0f4c81]">{SUPPORT_PHONE}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[#0f4c81] shrink-0">
              <PhoneCall size={18} />
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
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
                <div className="text-[#0f4c81] font-bold text-sm mt-0.5">Customer Service — {SUPPORT_PHONE}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Template matching New_Booking_Car_Rental_Payment_Authorization_Template (1).docx
  return (
    <div className="bg-white">
      {/* Top Header Bar */}
      <div className="bg-[#0f4c81] text-white px-5 sm:px-8 py-4 flex items-center justify-between">
        <div className="font-extrabold text-base sm:text-lg tracking-wide uppercase">
          CAR RENTAL PAYMENT AUTHORIZATION
        </div>
        <div className="font-bold text-base text-[#f59e0b]">{BRAND_NAME}</div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Greeting & Intro */}
        <div className="space-y-2">
          <div className="font-bold text-sm text-slate-900">Dear {customerName},</div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Thank you for choosing <strong>{BRAND_NAME}</strong> for your new car rental reservation. Please review your reservation details below and confirm your authorization so that we may complete your booking.
          </p>
          <div className="inline-block bg-slate-100 border border-slate-300 rounded px-3 py-1.5 text-xs font-bold text-[#0f4c81]">
            Authorization Reference: <span className="font-mono">{bookingRef}</span>
          </div>
        </div>

        {/* Table 1: Reservation Details */}
        <div className="border border-[#cbd5e1] rounded-lg overflow-hidden shadow-xs">
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2.5 font-bold text-xs text-[#0f4c81] uppercase tracking-wider flex items-center justify-between">
            <span>Reservation Details</span>
            <span className="text-[11px] text-slate-500 font-normal normal-case">Reference: {bookingRef}</span>
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#f8fafc] border-b border-[#cbd5e1] text-[#475569]">
              <tr>
                <th className="p-2.5 w-2/5 font-bold">Field</th>
                <th className="p-2.5 font-bold">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Booking Reference</td>
                <td className="p-2.5 font-bold text-[#0f172a]">{bookingRef}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Rental Company</td>
                <td className="p-2.5 text-[#1e293b] font-medium">{carProvider}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Booking Platform</td>
                <td className="p-2.5 text-[#1e293b]">{bookingPlatform}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Lead Driver</td>
                <td className="p-2.5 text-[#1e293b] font-semibold">{driverName}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Vehicle Type</td>
                <td className="p-2.5 text-[#1e293b] font-medium">{vehicleType}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Vehicle Model</td>
                <td className="p-2.5 text-[#1e293b] font-medium">{vehicleModel}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Pick-up</td>
                <td className="p-2.5 text-[#1e293b] font-medium">{pickupDisplay}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Return</td>
                <td className="p-2.5 text-[#1e293b] font-medium">{returnDisplay}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Rental Duration</td>
                <td className="p-2.5 font-bold text-[#0f4c81]">{durationDisplay}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 2: Payment Breakdown */}
        <div className="border border-[#cbd5e1] rounded-lg overflow-hidden shadow-xs">
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2.5 font-bold text-xs text-[#0f4c81] uppercase tracking-wider">
            Payment Breakdown
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#f8fafc] border-b border-[#cbd5e1] text-[#475569]">
              <tr>
                <th className="p-2.5 w-3/5 font-bold">Description</th>
                <th className="p-2.5 font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Prepaid Amount (Charged Now)</td>
                <td className="p-2.5 font-bold text-[#0f172a]">USD ${prepaidAmt.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Pay at Counter (Due at Pickup)</td>
                <td className="p-2.5 text-[#1e293b]">USD ${counterAmt.toFixed(2)}</td>
              </tr>
              <tr className="bg-[#f8fafc]">
                <td className="p-2.5 font-bold text-[#0f4c81]">Total Reservation Value</td>
                <td className="p-2.5 font-black text-[#0f4c81] text-sm">USD ${totalAmt.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Important Notice Box */}
        <div className="bg-[#fffbeb] border border-[#fef08a] border-l-4 border-l-[#f59e0b] rounded p-3.5 text-xs text-[#78350f] leading-relaxed">
          <strong>Important:</strong> The Prepaid Amount will be charged by {BRAND_NAME}. The Pay at Counter amount is payable directly to the rental company at vehicle pickup. Additional deposits or optional charges may be required by the rental company.
        </div>

        {/* Customer Authorization Box */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-5 space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-[#0f172a]">
            Customer Authorization
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700 leading-relaxed">
            <li>I am the authorized holder of the payment card provided.</li>
            <li>I authorize {BRAND_NAME} to charge the Prepaid Amount for my reservation.</li>
            <li>I understand the Pay at Counter amount is payable directly to the rental company.</li>
            <li>I have reviewed and approved the reservation details and payment breakdown.</li>
            <li>I authorize {BRAND_NAME} to complete my reservation with the selected rental supplier.</li>
            <li>I understand the rental company terms and conditions apply.</li>
            <li>I understand this charge is non-refundable and non-disputable.</li>
          </ul>

          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 text-xs font-bold text-[#065f46] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0f4c81] focus:ring-[#0f4c81]"
              />
              <span>I agree to all terms and conditions</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* Big Orange I AUTHORIZE Button */}
        <div className="text-center py-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Confirm Your Authorization
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleAcknowledge()}
              disabled={submitting || !agreed}
              className="px-14 py-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-base rounded-md shadow-md transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Recording Authorization…" : "I AUTHORIZE"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 max-w-lg mx-auto leading-relaxed">
            By clicking the &ldquo;I Authorize&rdquo; button on the live email, your electronic authorization should be securely recorded with the booking reference, customer name, prepaid amount, pay-at-counter amount, timestamp, IP address, browser/device information, email address, and consent status.
          </p>
        </div>

        {/* Footer info */}
        <div className="border-t border-[#e2e8f0] pt-4 text-center text-[11px] text-[#64748b] space-y-1">
          <div>
            <strong>Need Help?</strong> 24/7 Customer Support: <strong>{SUPPORT_PHONE}</strong>
            {SUPPORT_EMAIL && <span> | <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#0f4c81]">{SUPPORT_EMAIL}</a></span>}
          </div>
          <div>
            Thank you for choosing {BRAND_NAME}. &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved. <em>This is an automated authorization portal.</em>
          </div>
        </div>
      </div>
    </div>
  );
}
