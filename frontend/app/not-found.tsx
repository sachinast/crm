import Link from "next/link";
import { Compass, LayoutDashboard, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6 text-center select-none"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(211,171,94,0.12), transparent 45%), radial-gradient(circle at 80% 80%, rgba(19,26,43,0.95), transparent 50%), #0d1220",
      }}
    >
      <div className="w-full max-w-lg space-y-6">
        {/* Animated Glow 404 Visual Icon */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-[#2a3652] bg-[#131a2b] shadow-2xl shadow-black/50">
          <Compass size={48} className="text-[#d3ab5e] animate-pulse" />
          <div className="absolute -bottom-2.5 rounded-full border border-[#ef7b93]/30 bg-[#34131c] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#ef7b93]">
            404 ERROR
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Page Not Found
          </h1>
          <p className="mx-auto max-w-md text-sm text-slate-400">
            The destination URL or workspace route you are looking for does not exist, has been moved, or is inaccessible.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-[#d3ab5e]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <LayoutDashboard size={15} />
            <span>Go to Dashboard</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[#2a3652] bg-[#182136] px-5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
          >
            <Home size={15} />
            <span>Home Page</span>
          </Link>
        </div>

        {/* Footer Brand */}
        <p className="text-[11px] text-slate-400 pt-4">
          CRM PRO Enterprise • Booking Management System
        </p>
      </div>
    </main>
  );
}
