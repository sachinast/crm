import Link from "next/link";
import { Compass, LayoutDashboard, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center select-none bg-[var(--background)]">
      <div className="w-full max-w-lg space-y-6">
        {/* Animated Glow 404 Visual Icon */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] shadow-2xl">
          <Compass size={48} className="text-[var(--accent)] animate-pulse" />
          <div className="absolute -bottom-2.5 rounded-full border border-rose-500/30 bg-rose-950/30 px-2.5 py-0.5 font-mono text-xs font-bold text-rose-400">
            404 ERROR
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            Page Not Found
          </h1>
          <p className="mx-auto max-w-md text-sm text-[var(--ink-muted)]">
            The destination URL or workspace route you are looking for does not exist, has been moved, or is inaccessible.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="btn-primary"
          >
            <LayoutDashboard size={16} />
            <span>Go to Dashboard</span>
          </Link>

          <Link
            href="/"
            className="btn-secondary"
          >
            <Home size={16} />
            <span>Home Page</span>
          </Link>
        </div>

        {/* Footer Brand */}
        <p className="text-xs text-[var(--ink-faint)] pt-4">
          CRM PRO Enterprise • Booking Management System
        </p>
      </div>
    </main>
  );
}
