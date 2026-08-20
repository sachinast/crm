"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plane,
  Hotel,
  Car,
  ShieldCheck,
  Users,
  Activity,
  Clock,
  FileText,
  Code2,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Layers,
  BarChart3,
  Database,
  Globe,
  ChevronRight,
  Server,
  Terminal,
  Shield,
  Eye,
  Check,
  ArrowUpRight
} from "lucide-react";
import LoginModal from "@/components/auth/LoginModal";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface LandingProps {
  isBackendHealthy: boolean;
  healthError?: string;
  defaultLoginOpen?: boolean;
}

export default function LandingView({
  isBackendHealthy,
  healthError,
  defaultLoginOpen = false,
}: LandingProps) {
  const [activeTab, setActiveTab] = useState<"flights" | "hotels" | "cars" | "security">("flights");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(defaultLoginOpen);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--ink)] antialiased selection:bg-[var(--accent-soft)]">
      {/* Dynamic Ambient Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[580px] w-[900px] rounded-full bg-gradient-to-tr from-[rgba(179,135,47,0.18)] via-[rgba(18,23,43,0.12)] to-transparent blur-[120px] dark:from-[rgba(211,171,94,0.14)] dark:via-[rgba(30,40,75,0.25)]" />
        <div className="absolute top-[35%] -left-40 h-[450px] w-[500px] rounded-full bg-[rgba(62,207,154,0.06)] blur-[100px]" />
        <div className="absolute top-[55%] -right-40 h-[500px] w-[550px] rounded-full bg-[rgba(211,171,94,0.08)] blur-[110px]" />
      </div>

      {/* Fixed Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--hairline)] bg-[var(--background)]/90 backdrop-blur-xl transition-colors shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--navy)] to-[#202947] text-[var(--accent)] shadow-md shadow-black/10 ring-1 ring-[var(--hairline-strong)] transition-transform group-hover:scale-105">
              <span className="font-mono text-lg font-black tracking-tighter">P</span>
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-transparent opacity-0 blur-sm transition-opacity group-hover:opacity-40" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[var(--ink)]">CRM PRO</span>
                <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-ink)] ring-1 ring-[var(--accent)]/30">
                  ENTERPRISE
                </span>
              </div>
              <span className="text-[11px] font-medium text-[var(--ink-faint)]">Multi-Vertical Booking Engine</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#modules" className="text-sm font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
              Booking Engines
            </a>
            <a href="#architecture" className="text-sm font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
              Architecture
            </a>
            <a href="#capabilities" className="text-sm font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
              Enterprise Features
            </a>
            <a href="#system-status" className="text-sm font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
              System Health
            </a>
          </nav>

          {/* Right Action Bar & Health Status & Theme Switcher */}
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <ThemeToggle />

            {/* Live Health Badge */}
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md ${
                isBackendHealthy
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40 [data-theme=light]:bg-emerald-50 [data-theme=light]:text-emerald-700 [data-theme=light]:border-emerald-200"
                  : "bg-rose-950/40 text-rose-400 border-rose-800/40 [data-theme=light]:bg-rose-50 [data-theme=light]:text-rose-700 [data-theme=light]:border-rose-200"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isBackendHealthy && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              <span className="hidden sm:inline font-mono">
                {isBackendHealthy ? "API v1.0 ONLINE" : "OFFLINE"}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] hover:shadow-[var(--accent)]/30 active:scale-[0.98]"
            >
              <span>Launch Console</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16">
        
        {/* HERO SECTION */}
        <section className="pt-16 pb-20 text-center lg:pt-24 lg:pb-28">
          {/* Top Pill Announcement */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-raised)]/90 px-3.5 py-1.5 text-xs font-medium text-[var(--ink-muted)] shadow-sm backdrop-blur-md transition-all hover:border-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Next-Gen Travel & Hospitality Operations Platform</span>
            <span className="h-3 w-px bg-[var(--hairline-strong)]" />
            <span className="font-mono text-[var(--accent)]">v2.4 LTS</span>
          </div>

          {/* Hero Headline */}
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Unified Operations for{" "}
            <span className="bg-gradient-to-r from-[var(--accent)] via-[#e2b86c] to-[var(--accent-hover)] bg-clip-text text-transparent">
              High-Velocity
            </span>{" "}
            Booking Teams.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-3xl text-base text-[var(--ink-muted)] sm:text-xl sm:leading-8">
            An ultra-secure, audit-ready CRM engineered for multi-vertical booking lifecycles.
            Manage Flights, Hotels, and Fleet Rentals alongside granular RBAC, dynamic field master catalogs,
            real-time attendance, and embeddable lead capture widgets.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--navy)] px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-black/15 ring-1 ring-[var(--accent)]/30 transition-all hover:bg-[var(--navy-soft)] hover:scale-[1.02] dark:bg-[var(--accent)] dark:text-black dark:hover:bg-[var(--accent-hover)]"
            >
              <Zap className="h-4 w-4 text-[var(--accent)] dark:text-black" />
              <span>Enter Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <a
              href="#modules"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface)] px-6 py-3.5 text-sm font-semibold text-[var(--ink)] shadow-sm transition-all hover:bg-[var(--accent-soft)] hover:border-[var(--accent)]"
            >
              <Layers className="h-4 w-4 text-[var(--accent)]" />
              <span>Explore Engine Capabilities</span>
            </a>
          </div>

          {/* Key Metrics / Highlights Ribbon */}
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col items-center rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/70 p-4 backdrop-blur-md shadow-sm">
              <span className="font-mono text-2xl font-bold text-[var(--accent)]">40+</span>
              <span className="mt-1 text-xs font-medium text-[var(--ink-muted)]">Relational Entities</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/70 p-4 backdrop-blur-md shadow-sm">
              <span className="font-mono text-2xl font-bold text-[var(--success)]">&lt; 10ms</span>
              <span className="mt-1 text-xs font-medium text-[var(--ink-muted)]">FastAPI Query Latency</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/70 p-4 backdrop-blur-md shadow-sm">
              <span className="font-mono text-2xl font-bold text-[var(--info)]">Zero-Trust</span>
              <span className="mt-1 text-xs font-medium text-[var(--ink-muted)]">RBAC & PII Audit Logs</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]/70 p-4 backdrop-blur-md shadow-sm">
              <span className="font-mono text-2xl font-bold text-[var(--accent)]">3-in-1</span>
              <span className="mt-1 text-xs font-medium text-[var(--ink-muted)]">Car · Hotel · Flight</span>
            </div>
          </div>
        </section>

        {/* INTERACTIVE WORKSPACE MOCKUP PREVIEW */}
        <section id="preview" className="relative mb-28 scroll-mt-24">
          <div className="relative mx-auto max-w-5xl rounded-3xl border border-[var(--hairline-strong)] bg-gradient-to-b from-[var(--surface)] to-[var(--surface-raised)] p-3 shadow-2xl shadow-black/20 ring-1 ring-[var(--hairline)] sm:p-5">
            {/* Fake App Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] pb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <div className="h-3 w-3 rounded-full bg-green-400/80" />
                <span className="ml-2 font-mono text-xs text-[var(--ink-faint)]">crm-pro://production.internal</span>
              </div>

              {/* Multi-timezone clock simulator */}
              <div className="hidden items-center gap-4 font-mono text-[11px] text-[var(--ink-muted)] lg:flex">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-[var(--accent)]" /> UTC: 03:25
                </span>
                <span>•</span>
                <span>NYC: 23:25</span>
                <span>•</span>
                <span>LON: 04:25</span>
                <span>•</span>
                <span className="text-[var(--accent)] font-semibold">DEL: 08:55</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                  SUPER ADMIN
                </span>
              </div>
            </div>

            {/* Mock KPI Stat Cards */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-3.5">
                <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                  <span>Gross Pipeline</span>
                  <span className="text-emerald-500 font-semibold">+24.8%</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-[var(--ink)]">$342,850</div>
                <div className="mt-0.5 text-[10px] text-[var(--ink-faint)]">Across all active quotes</div>
              </div>

              <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-3.5">
                <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                  <span>Qualified Leads</span>
                  <span className="text-emerald-500 font-semibold">+12 new</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-[var(--ink)]">1,248</div>
                <div className="mt-0.5 text-[10px] text-[var(--ink-faint)]">48hr SLA compliance: 99%</div>
              </div>

              <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-3.5">
                <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                  <span>Active Dispatches</span>
                  <span className="text-[var(--accent)] font-semibold">Fleet Live</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-[var(--ink)]">86 Units</div>
                <div className="mt-0.5 text-[10px] text-[var(--ink-faint)]">Automatic + Chauffeur</div>
              </div>

              <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-3.5">
                <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                  <span>Agent Attendance</span>
                  <span className="text-emerald-500 font-semibold">98.4%</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-[var(--ink)]">32 On-Duty</div>
                <div className="mt-0.5 text-[10px] text-[var(--ink-faint)]">Real-time session tracker</div>
              </div>
            </div>

            {/* Interactive Module Tab Header */}
            <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] pb-3">
              <button
                onClick={() => setActiveTab("flights")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "flights"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--hairline)]"
                }`}
              >
                <Plane className="h-3.5 w-3.5" />
                <span>Flight Logistics</span>
              </button>

              <button
                onClick={() => setActiveTab("hotels")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "hotels"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--hairline)]"
                }`}
              >
                <Hotel className="h-3.5 w-3.5" />
                <span>Hotel Hospitality</span>
              </button>

              <button
                onClick={() => setActiveTab("cars")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "cars"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--hairline)]"
                }`}
              >
                <Car className="h-3.5 w-3.5" />
                <span>Car & Fleet Hire</span>
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "security"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--hairline)]"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>RBAC & Security Vault</span>
              </button>
            </div>

            {/* Dynamic Tab Body */}
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-4">
              {activeTab === "flights" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                    <span className="font-semibold text-[var(--ink)]">Recent Flight Manifests & PNR Pipeline</span>
                    <span className="font-mono text-[10px]">Real-time GDS Sync</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-modern">
                      <thead>
                        <tr>
                          <th>PNR / Lead</th>
                          <th>Routing</th>
                          <th>Carrier / Class</th>
                          <th>Travel Dates</th>
                          <th>Status</th>
                          <th>Quote</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-mono font-medium text-[var(--ink)]">#FL-9021 • Rahul Sharma</td>
                          <td>DEL ➔ LHR ➔ JFK</td>
                          <td>British Airways (Business)</td>
                          <td>Oct 12 - Oct 28</td>
                          <td><span className="badge bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Confirmed</span></td>
                          <td className="font-mono font-semibold">$4,850.00</td>
                        </tr>
                        <tr>
                          <td className="font-mono font-medium text-[var(--ink)]">#FL-9028 • Elena Rostova</td>
                          <td>DXB ➔ CDG (Direct)</td>
                          <td>Emirates (First)</td>
                          <td>Nov 04 - Nov 11</td>
                          <td><span className="badge bg-amber-500/10 text-amber-600 dark:text-amber-400">Ticket Issued</span></td>
                          <td className="font-mono font-semibold">$6,200.00</td>
                        </tr>
                        <tr>
                          <td className="font-mono font-medium text-[var(--ink)]">#FL-9034 • Marcus Chen</td>
                          <td>SIN ➔ HND ➔ SFO</td>
                          <td>Singapore Airlines (Economy)</td>
                          <td>Dec 01 - Dec 15</td>
                          <td><span className="badge bg-blue-500/10 text-blue-600 dark:text-blue-400">Quoting</span></td>
                          <td className="font-mono font-semibold">$1,940.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "hotels" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                    <span className="font-semibold text-[var(--ink)]">Hospitality Reservations & Voucher Management</span>
                    <span className="font-mono text-[10px]">Direct Property API</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-modern">
                      <thead>
                        <tr>
                          <th>Property Name</th>
                          <th>Room Category</th>
                          <th>Guests</th>
                          <th>Stay Duration</th>
                          <th>Meal Plan</th>
                          <th>Voucher</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-medium text-[var(--ink)]">The Ritz-Carlton Paris</td>
                          <td>Deluxe Executive Suite</td>
                          <td>2 Adults, 1 Child</td>
                          <td>5 Nights (Sep 14-19)</td>
                          <td>American Breakfast Included</td>
                          <td><span className="badge bg-emerald-500/10 text-emerald-600">Voucher Generated</span></td>
                        </tr>
                        <tr>
                          <td className="font-medium text-[var(--ink)]">Burj Al Arab Jumeirah</td>
                          <td>Panoramic One-Bedroom</td>
                          <td>2 Adults</td>
                          <td>3 Nights (Oct 02-05)</td>
                          <td>Half Board (Buffet)</td>
                          <td><span className="badge bg-emerald-500/10 text-emerald-600">Voucher Generated</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "cars" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                    <span className="font-semibold text-[var(--ink)]">Dynamic Fleet Dispatch & Vehicle Master</span>
                    <span className="font-mono text-[10px]">Master Field Catalog Integrated</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-modern">
                      <thead>
                        <tr>
                          <th>Vehicle Category</th>
                          <th>Model Spec</th>
                          <th>Transmission</th>
                          <th>Chauffeur / Self</th>
                          <th>Pickup Location</th>
                          <th>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-medium text-[var(--ink)]">Luxury Sedan</td>
                          <td>Mercedes-Benz S-Class (W223)</td>
                          <td><span className="font-mono text-xs">Automatic</span></td>
                          <td>Dedicated Chauffeur</td>
                          <td>Heathrow Terminal 5</td>
                          <td className="font-mono font-semibold">$320 / day</td>
                        </tr>
                        <tr>
                          <td className="font-medium text-[var(--ink)]">Premium SUV</td>
                          <td>Range Rover Autobiography</td>
                          <td><span className="font-mono text-xs">Automatic</span></td>
                          <td>Self Drive (Pre-cleared)</td>
                          <td>Downtown Zurich Hub</td>
                          <td className="font-mono font-semibold">$450 / day</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                    <span className="font-semibold text-[var(--ink)]">Zero-Trust Role-Based Access & PII Reveal Audit</span>
                    <span className="font-mono text-[10px]">Immutable PostgreSQL Audit Log</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] p-3">
                      <div className="flex items-center gap-2 font-semibold text-xs text-[var(--accent)]">
                        <Lock className="h-3.5 w-3.5" /> PII Phone & Email Masking
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                        Phone and passport numbers are masked (`+91 ••••• ••129`). Unmasking triggers immediate audit event.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] p-3">
                      <div className="flex items-center gap-2 font-semibold text-xs text-[var(--success)]">
                        <Shield className="h-3.5 w-3.5" /> Granular Role Matrix
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                        Hierarchical permissions across Super Admin, Team Leader, Agent, and Viewer roles.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] p-3">
                      <div className="flex items-center gap-2 font-semibold text-xs text-[var(--info)]">
                        <Globe className="h-3.5 w-3.5" /> IP & Geo Whitelisting
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
                        Per-user IP range restrictions and automated session invalidation on unauthorized access attempts.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CORE MODULES SHOWCASE */}
        <section id="modules" className="py-16 scroll-mt-24">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Multi-Vertical Booking Engines</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              One Unified System. Three Purpose-Built Engines.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--ink-muted)]">
              No need for separate disconnected tools. CRM Pro integrates every travel modality into an interconnected relational pipeline.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Flight Engine Card */}
            <div className="group relative rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Plane className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--ink)]">Flight Logistics Engine</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                Handle multi-leg routing, PNR tracking, fare quotes, class variations, baggage allocations, and cancellation recalculations.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[var(--ink-muted)]">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> Multi-city & round-trip routing
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> Automated markup & taxes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> PNR lifecycle state transitions
                </li>
              </ul>
            </div>

            {/* Hotel Hospitality Card */}
            <div className="group relative rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Hotel className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--ink)]">Hospitality & Stays Engine</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                Manage property catalogs, room types, meal plans, guest occupancy rules, and generate professional PDF booking vouchers.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[var(--ink-muted)]">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> Check-in/out scheduling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> Room amenity configuration
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> Instant voucher distribution
                </li>
              </ul>
            </div>

            {/* Car & Fleet Card */}
            <div className="group relative rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Car className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--ink)]">Fleet & Chauffeur Engine</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                Dynamic master-driven vehicle categories (Sedan, SUV, Luxury), transmission presets, chauffeur assignments, and hourly rates.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[var(--ink-muted)]">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> Admin Master Option fields
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> Chauffeur allocation logs
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> Flexible duration calculations
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ENTERPRISE CAPABILITIES GRID */}
        <section id="capabilities" className="py-16 scroll-mt-24">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Enterprise Features</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Engineered for Scale, Compliance & Speed
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Code2 className="h-5 w-5" />
              </div>
              <h4 className="mt-3 font-bold text-sm text-[var(--ink)]">Embeddable Lead Capture Widgets</h4>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Generate lightweight embed scripts for external landing pages with duplicate lead detection, CORS origin whitelisting, and UTM tracking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Clock className="h-5 w-5" />
              </div>
              <h4 className="mt-3 font-bold text-sm text-[var(--ink)]">Agent Attendance & Team Clocks</h4>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Real-time check-in/out logging, daily work duration metrics, multi-timezone header clocks, and manager oversight tools.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="mt-3 font-bold text-sm text-[var(--ink)]">Encrypted File & Document Vault</h4>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Store booking documents, passport attachments, and generate password-protected or view-limited public sharing links with full access logs.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Database className="h-5 w-5" />
              </div>
              <h4 className="mt-3 font-bold text-sm text-[var(--ink)]">Dynamic Master Field Options</h4>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Admins can add, reorder, or deprecate custom select options (e.g. vehicle types, airline carriers, amenities) without code deployments.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="mt-3 font-bold text-sm text-[var(--ink)]">Team Leader & Agent Routing</h4>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Automated lead round-robin distribution, capacity caps, performance metrics leaderboard, and quick reassignment workflows.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h4 className="mt-3 font-bold text-sm text-[var(--ink)]">Real-Time In-App Messaging</h4>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Direct and group conversation channels with file attachment previews, team mentions (`@user`), and instant unread counters.
              </p>
            </div>
          </div>
        </section>

        {/* SYSTEM ARCHITECTURE & HEALTH STATUS */}
        <section id="architecture" className="py-16 scroll-mt-24">
          <div className="rounded-3xl border border-[var(--hairline-strong)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-raised)] p-6 sm:p-10 shadow-lg">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-ink)]">
                  <Server className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Production-Grade Architecture</span>
                </div>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
                  Modern High-Throughput Stack
                </h3>
                <p className="mt-2 max-w-2xl text-xs text-[var(--ink-muted)] sm:text-sm">
                  Powered by Python FastAPI (Async Engine), PostgreSQL 16 relational core with Alembic migrations,
                  Redis task broker, and Next.js 16 App Router.
                </p>
              </div>

              {/* Status Box */}
              <div id="system-status" className="flex flex-col gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 sm:min-w-[280px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--ink-muted)]">Database Engine</span>
                  <span className="font-mono font-semibold text-[var(--success)]">PostgreSQL 16</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--ink-muted)]">API Protocol</span>
                  <span className="font-mono font-semibold text-[var(--ink)]">REST / AsyncPG</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--ink-muted)]">Alembic Migration</span>
                  <span className="font-mono font-semibold text-[var(--accent)]">Revision 0014 (Head)</span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--hairline)] pt-2 text-xs">
                  <span className="font-medium text-[var(--ink-muted)]">Live API Status</span>
                  <span className={`font-mono font-semibold ${isBackendHealthy ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                    {isBackendHealthy ? "HEALTHY (200 OK)" : "UNREACHABLE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA CALLOUT */}
        <section className="my-20 text-center">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--navy)] via-[#1a233d] to-[#12172b] p-8 sm:p-14 text-white shadow-2xl ring-1 ring-[var(--accent)]/30">
            <div className="relative z-10">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ready to accelerate your booking operations?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-[#cbd2e6]">
                Log in to the CRM Pro control center to manage leads, quotes, bookings, master tables, and user permissions.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-[var(--accent)]/30 transition-all hover:scale-105 active:scale-95"
                >
                  <span>Sign In to CRM PRO</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[var(--hairline)] bg-[var(--surface)] py-8 text-xs text-[var(--ink-muted)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--ink)]">CRM PRO</span>
            <span>•</span>
            <span>Enterprise Multi-Vertical Booking System</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#modules" className="hover:text-[var(--ink)] transition-colors">Modules</a>
            <a href="#capabilities" className="hover:text-[var(--ink)] transition-colors">Security</a>
            <a href="#architecture" className="hover:text-[var(--ink)] transition-colors">Stack</a>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="font-semibold text-[var(--accent)] hover:underline"
            >
              Console Login
            </button>
          </div>
          <p>© {new Date().getFullYear()} CRM PRO. All rights reserved.</p>
        </div>
      </footer>

      {/* Interactive Login Modal on Home Page */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}
