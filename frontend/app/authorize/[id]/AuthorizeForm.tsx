"use client";

import { CheckCircle2, PhoneCall, Tag, Ticket } from "lucide-react";
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
  return "**** **** **** 9899";
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

  const b = summary.booking;
  const leadId = summary.lead_id;
  const customerName = summary.customer_name || "Customer";
  const customerEmail = summary.customer_email || String(b.email || b.contact_email || b.guest_email || "customer@example.com");
  const customerPhone = summary.customer_phone || String(b.phone || b.driver_phone || b.contact_phone || b.guest_phone || "—");
  const customerDob = String(b.customer_dob || b.dob || b.pickup_datetime || "—");
  const agencyRef = String(b.agency_reference || "done");
  const bookingPlatform = String(b.booking_platform || "Direct");
  const carProvider = String(b.car_provider || b.hotel_name || b.airline || "Car Rental");
  const cardType = String(b.card_type || "Credit Card");
  const maskedCard = maskCardNumber(b.card_number);
  const cardHolderName = String(b.card_holder_name || customerName);

  const prepaidAmt = Number(b.prepaid_amount || 0);
  const counterAmt = Number(b.pay_at_counter_amount || 0);
  const totalAmt = Number(b.total_amount || prepaidAmt || 0);
  const chargeDisplay = totalAmt > 0 ? `USD ${totalAmt.toFixed(2)}` : `USD ${prepaidAmt.toFixed(2)}`;

  async function handleAcknowledge(e?: FormEvent) {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);

    const systemName =
      typeof navigator !== "undefined"
        ? (navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent
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

  // If confirmed, render the exact Screenshot 1 Thank You confirmation screen!
  if (confirmed) {
    return (
      <div>
        {/* Header with Call Center Avatar */}
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

  return (
    <div className="bg-white">
      {/* Blue Top Header Bar matching Screenshots 2 & 3 */}
      <div className="bg-[#0f4c81] text-white px-5 py-3.5 flex items-center justify-between">
        <div className="font-bold text-base tracking-tight">{serviceTitle} Booking Information</div>
        <div className="font-bold text-base text-[#f59e0b]">{BRAND_NAME}</div>
      </div>

      <div className="p-6 sm:p-8 space-y-5">
        {/* Intro text */}
        <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
          We would like you to go through your itinerary carefully. Please click on <strong>&apos;Acknowledge&apos;</strong> only when you have checked all the information and you are completely satisfied with the itinerary and price. As per our conversation and as agreed, we are Booking your itinerary as follows:
        </p>

        {/* Status Badge */}
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-2">
          <span>&#10004;</span>
          <span>Booking Processed — Awaiting Electronic Authorization</span>
        </div>

        {/* Table 1: Booking Info */}
        <div className="border border-[#cbd5e1] rounded overflow-hidden">
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2 font-bold text-xs text-[#0f4c81]">
            Booking Info
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <tbody className="divide-y divide-[#e2e8f0]">
              <tr>
                <td className="w-2/5 p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Our Booking Ref. No</td>
                <td className="p-2.5 font-bold text-[#0f172a]">{bookingRef}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Agency Ref. No</td>
                <td className="p-2.5 text-[#1e293b]">{agencyRef}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Booking Platform</td>
                <td className="p-2.5 text-[#1e293b]">{bookingPlatform}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">{serviceTitle} Provider</td>
                <td className="p-2.5 text-[#1e293b]">{carProvider}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 2: Renter Details */}
        <div className="border border-[#cbd5e1] rounded overflow-hidden">
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2 font-bold text-xs text-[#0f4c81]">
            Renter Details
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <tbody className="divide-y divide-[#e2e8f0]">
              <tr>
                <td className="w-2/5 p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Name</td>
                <td className="p-2.5 font-bold text-[#0f172a]">{customerName}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Date of Birth</td>
                <td className="p-2.5 text-[#1e293b]">{customerDob}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Email</td>
                <td className="p-2.5 text-[#1e293b]">{customerEmail}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Phone</td>
                <td className="p-2.5 text-[#1e293b]">{customerPhone}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 3: Payment Details */}
        <div className="border border-[#cbd5e1] rounded overflow-hidden">
          <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2 font-bold text-xs text-[#0f4c81]">
            Payment &amp; Card Details
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <tbody className="divide-y divide-[#e2e8f0]">
              <tr>
                <td className="w-2/5 p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Card Type</td>
                <td className="p-2.5 text-[#1e293b]">{cardType}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Card Number</td>
                <td className="p-2.5 font-mono text-[#1e293b]">{maskedCard}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Card Holder Name</td>
                <td className="p-2.5 text-[#1e293b]">{cardHolderName}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-[#475569] bg-[#fcfdfe]">Total Charged Amount</td>
                <td className="p-2.5 font-extrabold text-[#0f4c81] text-sm">{chargeDisplay}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legal Authorization Box matching Screenshots 2 & 3 */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 text-[11.5px] text-[#475569] leading-relaxed">
          This is to confirm that, in keeping with all applicable laws, I/We <strong>{cardHolderName}</strong> are instructing <strong>E-Booking Desk</strong>, to book the {serviceTitle} mentioned against the following credit card. It is expressly understood that the amount charged will be <strong>({chargeDisplay})</strong> inclusive of all taxes and fees. However, it may be charged in split payments, not exceeding the total amount mentioned above. I/We further represent that, the Credit Card Type, ({cardType}) card ending with <strong>{maskedCard.slice(-4)}</strong> has been provided by me/us to authorize this transaction. It is also understood and accepted that to provide additional security of my/our personal information, E-Booking Desk, may verify Credit Card information and billing address as provided by me/us and have the {serviceTitle} confirmation shared over the email. It is further understood and agreed that I/We <strong>{cardHolderName}</strong> accept full responsibility for the amount due to <strong>E-Booking Desk</strong> and the Terms &amp; Conditions of cancellation or refund as mentioned.
        </div>

        {/* Important Rental Info Box */}
        <div className="border border-[#e2e8f0] rounded p-4 text-[11.5px] text-[#334155] space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wide text-[#0f172a] m-0">Important Rental Information</h4>
          <ul className="list-disc pl-5 space-y-1 text-slate-600 m-0">
            <li>Your credit card may be billed in multiple charges, not exceeding the total amount.</li>
            <li>Additional fees may apply if changes are made to your return date, time, and/or location.</li>
            <li>Lead driver must carry a valid original driving license card at the time of vehicle pickup.</li>
            <li><strong>Please note that the prepaid amount is non-refundable.</strong></li>
            <li>Ensure all travel documents (such as visas) required for your destination or transit countries are valid.</li>
          </ul>
        </div>

        {/* Debit Card Policy Box */}
        <div className="border border-[#e2e8f0] rounded p-4 text-[11.5px] text-[#334155] space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wide text-[#0f172a] m-0">Debit Card Policy</h4>
          <ol className="list-decimal pl-5 space-y-1 text-slate-600 m-0">
            <li>Your address must be within a 50-mile radius of the rental location.</li>
            <li>You may be required to present a utility bill at the time of pickup.</li>
            <li>A soft credit check may be conducted at the time of pickup.</li>
            <li>In some cases, a higher security deposit may be required.</li>
            <li>For airport pickups, a round-trip ticket is mandatory.</li>
          </ol>
          <div className="text-[11px] text-slate-500 pt-1">
            For more information read <span className="text-[#0f4c81] underline cursor-pointer">Terms &amp; Conditions</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* Big Orange Acknowledge CTA Button matching Screenshot 3 */}
        <div className="text-center py-4 space-y-2">
          <button
            type="button"
            onClick={() => handleAcknowledge()}
            disabled={submitting}
            className="px-12 py-3.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm rounded shadow-md transition-all uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Recording Authorization…" : "Acknowledge"}
          </button>
          <p className="text-[11px] text-slate-400">
            Clicking &apos;Acknowledge&apos; securely records your electronic confirmation with timestamp &amp; audit trail.
          </p>
        </div>

        {/* Footer info */}
        <div className="border-t border-[#e2e8f0] pt-4 text-center text-[11px] text-[#64748b] space-y-1">
          <div>
            <strong>Need Help?</strong>
            {SUPPORT_PHONE && <span> 24/7 Customer Support: <strong>{SUPPORT_PHONE}</strong></span>}
            {SUPPORT_EMAIL && <span> | <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#0f4c81]">{SUPPORT_EMAIL}</a></span>}
          </div>
          <div>Thank you for choosing {BRAND_NAME}. &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved. <em>This is an automated authorization portal.</em></div>
        </div>
      </div>
    </div>
  );
}
