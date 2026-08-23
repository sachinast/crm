import { CheckCircle2, PhoneCall, ShieldCheck, Tag, Ticket } from "lucide-react";
import Image from "next/image";
import AuthorizeForm from "./AuthorizeForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface Summary {
  lead_id: string;
  customer_name: string;
  service_type: string;
  status: string;
  booking: Record<string, unknown>;
}

async function fetchSummary(id: string): Promise<{ summary: Summary | null; error: string | null }> {
  try {
    const resp = await fetch(`${API_BASE_URL}/leads/${id}/authorization-summary`, { cache: "no-store" });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return { summary: null, error: typeof body.detail === "string" ? body.detail : "This authorization link is invalid or expired." };
    }
    return { summary: await resp.json(), error: null };
  } catch (err) {
    return { summary: null, error: "Unable to connect to authorization service." };
  }
}

export default async function AuthorizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { summary, error } = await fetchSummary(id);

  if (!summary) {
    return (
      <main className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-4">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Authorization Notice</h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <div className="text-xs text-slate-500 border-t border-slate-100 pt-4">
            If you need help with your reservation, please contact 24/7 customer support at <strong>+1 (877) 362-2838</strong>.
          </div>
        </div>
      </main>
    );
  }

  const bookingRef = String(summary.booking.booking_reference || `EC${id.slice(0, 6).toUpperCase()}`);
  const serviceTitle = summary.service_type.charAt(0).toUpperCase() + summary.service_type.slice(1);
  const isAlreadyApproved = summary.status === "client_approved" || summary.status === "card_charged" || summary.status === "transferred_to_billing";

  return (
    <main className="min-h-screen bg-[#f4f6f9] py-6 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white border border-[#d1d5db] rounded-lg shadow-sm overflow-hidden">
        {/* Top Header Banner */}
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#0f4c81] text-white flex items-center justify-center font-black text-lg tracking-wider shadow-sm">
              ED
            </div>
            <div>
              <div className="font-extrabold text-[#0f4c81] text-lg leading-tight tracking-tight">E-Booking Desk</div>
              <div className="text-[11px] text-slate-500 font-medium">Customer Reservation Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-700">Book Online or Call Us 24/7</div>
              <div className="text-xs font-semibold text-[#0f4c81]">+1 (877) 362-2838</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[#0f4c81] overflow-hidden shrink-0">
              <PhoneCall size={18} />
            </div>
          </div>
        </div>

        {/* Thank You / Confirmation Screen (Matching Screenshot 1) */}
        {isAlreadyApproved ? (
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
                  <div className="text-[#0f4c81] font-bold text-sm mt-0.5">Customer Service — +1 (877) 362-2838</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Interactive Acknowledgment & Consent Form */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center py-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0f4c81] tracking-tight">Confirm Your {serviceTitle} Booking</h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Dear <strong>{summary.customer_name}</strong>, please review your itinerary and authorize the reservation below.
              </p>
            </div>

            {/* Summary details */}
            <div className="border border-[#cbd5e1] rounded-md overflow-hidden text-xs">
              <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-4 py-2.5 font-bold text-[#0f4c81] uppercase tracking-wider">
                Booking Information
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><span className="text-slate-500 font-semibold">Booking Reference:</span> <strong className="text-slate-800">{bookingRef}</strong></div>
                <div><span className="text-slate-500 font-semibold">Service Type:</span> <strong className="text-slate-800 capitalize">{summary.service_type}</strong></div>
                <div><span className="text-slate-500 font-semibold">Prepaid Amount:</span> <strong className="text-slate-800">USD ${Number(summary.booking.prepaid_amount || 0).toFixed(2)}</strong></div>
                <div><span className="text-slate-500 font-semibold">Pay at Counter:</span> <strong className="text-slate-800">USD ${Number(summary.booking.pay_at_counter_amount || 0).toFixed(2)}</strong></div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700">Total Charged Amount:</span>
                  <span className="font-extrabold text-[#0f4c81] text-base">USD ${Number(summary.booking.total_amount || summary.booking.prepaid_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Legal Statement */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-4 text-xs text-slate-600 leading-relaxed">
              This is to confirm that, in keeping with all applicable laws, I/We <strong>{summary.customer_name}</strong> are instructing <strong>E-Booking Desk</strong> to book the {serviceTitle} mentioned against my credit card on file. It is expressly understood that the amount charged will be inclusive of all taxes and fees, and I accept the terms &amp; conditions of cancellation or refund.
            </div>

            {/* Consent Form */}
            <AuthorizeForm leadId={id} bookingRef={bookingRef} serviceTitle={serviceTitle} />
          </div>
        )}
      </div>
    </main>
  );
}
