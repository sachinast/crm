# CRM — Car · Hotel · Flight Booking Management Platform

Secure, role-based, audit-ready lead-to-booking CRM.

**Stack:** Next.js (TypeScript) · FastAPI · PostgreSQL · Redis · Celery

## Docs

- [Product Requirements & Technical Proposal](docs/CRM-PRD.pdf) — original source document.
- [Technical Specification](docs/TECHNICAL_SPEC.md) — database schema (DDL), API contracts,
  RBAC & status state-machine design, project structure, and the phased delivery plan.

## Status: Floating chat widget + universal message notifications complete

**Phase 0 — Scaffolding:**

- ✅ PostgreSQL 16 schema migrated (`backend/alembic/versions/0001_baseline_schema.py`) — all
  20 core tables + seeded `status_lookup` from TECHNICAL_SPEC.md §2.
- ✅ Status state machine (`backend/app/domain/status_machine.py`) and masking helpers
  (`backend/app/domain/masking.py`) implemented per §3/§8, ready for Phase 4 wiring.
- ✅ Celery app stub boots (`backend/app/workers/celery_app.py`).
- ✅ `docker-compose.yml` for a fully containerized stack; CI (`.github/workflows/ci.yml`)
  runs backend tests + migrations and frontend lint/build on every push.

**Phase 1 — Auth & RBAC:**

- ✅ JWT auth (`POST /auth/login`, `/auth/refresh`, `/auth/logout`) — passwords hashed with
  bcrypt, no self-registration (accounts are provisioned by Admin/Super Admin only, per PRD §3).
- ✅ RBAC dependencies (`require_role`, `require_ip_whitelisted` in `backend/app/api/deps.py`)
  enforced on every `/users` and `/system-settings` endpoint.
- ✅ `backend/app/scripts/seed_superadmin.py` bootstraps the first account (there's no
  self-registration, so something has to seed it).
- ✅ 15 passing pytest tests covering login, refresh, role checks (403s), IP whitelist
  enforcement, and the registration-toggle Super-Admin gate — runs against a real Postgres.
- ✅ Frontend: working login page, httpOnly-cookie session (`app/api/auth/*` route handlers —
  tokens never reach client JS), role-aware dashboard nav, route protection (`proxy.ts`), and a
  **live** Admin → Users page (list + create-user form) wired to the real backend.
- ✅ End-to-end verified in-browser: unauthenticated redirect → login → role-aware dashboard →
  create a user through the UI → new user logs in successfully.

**Phase 2 — Lead-first flow:**

- ✅ `POST /leads` (Step 1) creates the lead and runs duplicate detection inline — exact match
  on phone/email, trigram fuzzy match on name (`backend/app/domain/duplicate_check.py`).
- ✅ `GET /leads/{id}/duplicate-check` (Step 2) returns the candidate list; `POST
  /leads/{id}/confirm` (Step 3) captures the agent's override reason; `PATCH
  /leads/{id}/service-type` (Step 4) unlocks the booking form and 409s until a flagged
  duplicate is confirmed.
- ✅ Row-level RBAC visibility (`apply_lead_visibility` in `backend/app/api/deps.py`): Agents
  see only their own leads, Super Admin/Admin/TL see all, everyone else sees nothing yet
  (correct — status-based sharing to Billing/Auditor/etc. is Phase 4). 404s (not 403s) for
  leads outside a user's visibility, so existence isn't leaked across the RBAC boundary.
- ✅ `GET /leads/{id}` logs `access_notification_log` + writes `notifications` rows for the
  admin role and the owning agent (real-time delivery lands in Phase 4).
- ✅ 10 new passing pytest tests (35 total) covering duplicate detection, the confirm/unlock
  gate, RBAC visibility across roles, and the email/mobile filters.
- ✅ Frontend: a real multi-step lead intake flow (`app/(dashboard)/leads/new`), a live leads
  list with email/mobile filters, and a lead detail page — all wired to the backend, no
  placeholders. Verified end-to-end in-browser, including the duplicate-detection prompt
  firing correctly on a matching phone number and the "dup" badge showing in the list.

**Phase 3 — Booking modules:**

- ✅ `POST/GET/PATCH /leads/{id}/{car,hotel,flight}-booking` — all three modules, generated
  from one factory (`backend/app/api/v1/bookings.py`) since the three are structurally
  identical (1:1 with the lead, gated on the lead's `service_type` matching).
- ✅ Guards: 409 if the lead's service type doesn't match the module being booked, 409 if a
  booking already exists for that lead (use PATCH instead), 422 if return-before-pickup
  (car) or checkout-before-checkin (hotel) — the latter also DB-enforced (`ck_hotel_dates`).
- ✅ `total_amount` is never client-settable — it's the DB-generated
  `prepaid_amount + pay_at_counter_amount` column on every *Read schema.
- ✅ 10 new passing pytest tests (35 total) covering all three modules' full lifecycle,
  the service-type/duplicate-booking guards, and that booking endpoints inherit the same
  lead-visibility 404s as the lead itself.
- ✅ Frontend: real Car/Hotel/Flight forms (`app/(dashboard)/leads/[id]/booking/{car,hotel,
  flight}`) matching every PRD §5 field, including the full 18-option standardized vehicle-type
  dropdown. Lead detail page shows a "Complete {type} booking" CTA until one exists, then a
  summary with an Edit link (same form, pre-filled, PATCHes instead of POSTs).
- ✅ Verified end-to-end in-browser: created a lead, selected Car Rental, filled and submitted
  the full booking form, and the lead detail page rendered the persisted booking with the
  correct DB-computed total (150 + 50 = 200) — then reopened via Edit and confirmed the form
  came back pre-filled from the saved data.

**Phase 4 — Status engine:**

- ✅ `PATCH /leads/{id}/status` — the state-machine endpoint (`backend/app/domain/status_machine.py`,
  built back in Phase 0, finally wired up). Row-locks the lead (`SELECT ... FOR UPDATE`),
  validates the transition edge and the actor's role against the same table, writes
  `status_history` + `notifications` in the same transaction, then pushes over WebSocket.
  `client_approved`/`authorization_pending` are CUSTOMER/SYSTEM-only in that table, so no
  staff Bearer token can ever set them here — that's Phase 5's "I Authorize" flow.
- ✅ **Status-based visibility is now real**: `ROLE_RELEVANT_STATUSES` (status_machine.py) plus
  `apply_lead_visibility` (deps.py) mean Billing/Auditor/Change Dep/CR Booking/Chargeback Dep
  see a lead exactly while it's relevant to their stage — visibility (and the ability to act)
  both arrive *and leave* automatically as the status moves. (This closed a real gap: Phase 2
  had these roles seeing nothing at all, since nothing routed statuses to them yet.)
- ✅ `GET /leads/{id}/available-transitions` — drives the frontend's action buttons from the
  same transition graph and role rules, so the UI never duplicates that logic.
- ✅ `GET /leads/{id}/status-history` and a real `WS /ws/notifications` endpoint
  (`backend/app/api/v1/websocket.py`) — in-memory connection registry, correct for the single
  uvicorn worker this runs in; noted where it'd need Redis Pub/Sub for multi-worker prod.
- ✅ 8 new passing pytest tests (43 total): the full standard flow end-to-end, role checks at
  every hop, history ordering, and that a lead already moved on by a racing request 409s
  instead of being silently overwritten.
- ✅ Frontend: status badge (PRD §6.1 colors), role-filtered action buttons, a status-history
  audit trail, and a live notification bell (`NotificationBell` + `lib/ws-client.ts`) fed by
  the WebSocket.
- ✅ Verified end-to-end: walked a lead through the *entire* PRD §6.2 standard flow through the
  real UI — client_approved → transferred_to_billing (Agent/Admin) → card_charged (Billing
  only, Agent correctly 403'd) → tag_auditor → qc_done (Auditor only) — with the status badge,
  action buttons, and audit trail all updating correctly at each hop, and each role's Leads
  list only showing the lead while it was actually theirs to act on. Live WebSocket delivery
  confirmed with a standalone listener (browser tabs share cookies/sessions, so a same-browser
  two-tab test can't show two concurrent *users* — a Billing-authenticated WS client received
  the `transferred_to_billing` push the instant an unrelated session triggered it).

**Phase 5 — Payments & consent:**

- ✅ **`client_approved` is real now.** The one status that's been unreachable since Phase 4
  (CUSTOMER-only, no staff endpoint can set it) has an actual customer-facing flow:
  `GET/POST /leads/{id}/authorization` (PRD §8). Deliberately the one *unauthenticated* part of
  this API — no Bearer token, the lead's own UUID is the capability link (documented tradeoff
  in `app/schemas/authorization.py`: a production hardening pass would swap in a dedicated,
  expiring, single-use token instead).
- ✅ Full PRD §8.2 consent package (6 checkboxes, all required True — 422 otherwise) plus
  metadata capture (IP, user-agent, timestamp) into `authorization_records`. Blocked with a
  clear 409 until a booking actually exists, and can't be submitted twice.
- ✅ `POST /payments` — Billing charge/decline. Pulls prepaid/pay-at-counter amounts off the
  lead's *booking* rather than re-collecting them from the caller, and drives the
  `card_charged`/`card_declined` status transition through the same shared service
  (`app/services/status_transitions.py`, factored out of Phase 4's endpoint so both callers
  share one row-lock/validate/notify/push implementation instead of two copies drifting apart).
  Card data: last-4 + opaque processor token only, never a raw PAN (TECHNICAL_SPEC.md §8) —
  and the token is never echoed back in API responses.
- ✅ 12 new passing pytest tests (55 total), including the full authorize-then-charge flow
  driven entirely through real endpoints (no direct DB writes standing in for a missing step).
- ✅ Frontend: a public `/authorize/[id]` page (booking summary, payment breakdown, consent
  form) that talks straight to the backend — no session, nothing to proxy. Staff side: the lead
  detail page now offers a shareable authorization link once a booking exists, and Billing gets
  a dedicated payment-processing form (last-4 + Charge/Decline) instead of a bare status button,
  plus a payment history section.
- ✅ Verified end-to-end in-browser, full loop: created a lead → booked a car → shared the
  `/authorize/{id}` link, opened it in a separate tab with no login at all, checked all 6
  consent boxes, submitted → status flipped to `client_approved` on the agent's view →
  transferred to Billing → Billing charged the card with a last-4 → status became
  `card_charged`, with both the payment history ("charged · $125.00 · ****4242") and status
  history showing the complete, correctly-ordered chain.

**Phase 6 — Modifications, cancellations & future credits:**

- ✅ `POST/GET /leads/{id}/modifications` — the PRD §7.1 "Original vs. Revised" paired snapshot.
  Deliberately doesn't also update the live booking row (staff use the existing booking edit
  form for that, from Phase 3) — this endpoint's job is only the audit trail + the $ impact.
  Auto-computes the modification amount when both sides are numbers (e.g. a price change);
  otherwise requires or defaults it, since the system can't infer a dollar impact from e.g. a
  location change.
- ✅ `POST/GET /leads/{id}/cancellation` — PRD §7.2 refund math. `refund_amount`/
  `final_retained_amount` are DB-generated columns (`GREATEST`/`LEAST` over prepaid vs. penalty,
  built back in Phase 0) — the backend only ever supplies the two inputs; Postgres does the
  "system calculates" part, including the edge case where the penalty exceeds what was ever paid.
- ✅ `POST/GET /future-credits` — PRD §7.3: creation restricted to TL/CS, read access for
  Billing/CS/Change Dep/Chargeback Dep/Auditor. Not scoped by lead visibility like everything
  else in this API — the PRD frames it as a company-wide voucher ledger with its own role list.
- ✅ 12 new passing pytest tests (67 total), including the exact PRD refund formula (150 prepaid,
  40 penalty → 110 refund / 40 retained) and the clamping case (penalty exceeding prepaid).
- ✅ Frontend: a Modifications panel (record + history) and Cancellation panel (form that becomes
  a read-only summary once cancelled) on the lead detail page, gated to Change Dep/CS/Admin/Super
  Admin; a real Future Credits page (was a Phase-0 placeholder) with role-gated create form and
  a friendly "no access" message for roles outside the PRD's read list, instead of a crash.
- ✅ Verified end-to-end in-browser: walked a lead through the full chain to `tag_change_dep`,
  recorded a modification as Change Dep (`pickup_location: LAX → SFO (+$15.00)`), cancelled the
  same booking (`$150 prepaid, $50 penalty → $100 refund / $50 retained` — matches the formula
  exactly), created a future credit as TL, confirmed Billing could read it, and confirmed Agent
  got a clean "no access" message rather than an error.

**Phase 7 — Security & audit:**

- ✅ **Masking is real now.** `LeadRead`/`LeadSummary` mask email/phone by default (`exa***@mail.
  com`, `*******1234`) via a Pydantic `model_validator` — this closes a gap flagged in code
  comments since Phase 2 ("raw values are intentionally still visible here"). `PaymentRead` masks
  card details the same way (`****-****-****-4242`), replacing the old `card_last_four` field
  with `card_display` so a masked value can never accidentally serialize under a name that
  implies it's raw.
- ✅ `POST /leads/{id}/reveal` — click-to-reveal for email/phone/card, PRD §9.1/§9.2. Anyone who
  can already see the lead can reveal it (masking is presentation, not an extra permission gate);
  the mandatory reason + logged access (agent, field, timestamp, IP, device, CRM ID) is the actual
  control. "Card" reveal is honest about there being nothing more to unmask beyond the last-4
  already on file — this system never stores a full PAN (a decision from Phase 5, carried through
  consistently rather than re-litigated here).
- ✅ `booking_process_log` finally has writers — `app/domain/process_log.py`, called from lead
  creation, duplicate-confirm, service-type selection, and every status transition (both the
  shared staff service and the customer-facing authorize flow). The admin-only master "Log Report
  of Booking Process" PRD §9.3 describes now actually has something to report.
- ✅ `GET /audit/{pii-reveals,process-log,access-log}` — Admin/Super Admin only, each with an
  optional `lead_id` filter. `access_notification_log` (written since Phase 2) finally has a read
  endpoint too.
- ✅ Closed a Phase 5 loose end: `GET /leads/{id}/authorization-record` — the staff-facing view of
  captured "I Authorize" consent that was documented but never built.
- ✅ 12 new passing pytest tests (79 total): masking in create/list/get/duplicate-check responses,
  reveal logging the exact reason and respecting lead visibility (a second agent gets a 404, not
  the data), Admin-only audit endpoints, and confirmation that nothing in this codebase ever
  updates or deletes a `booking_process_log` row once written.
- ✅ Frontend: `RevealField` (masked value + inline reveal-with-reason prompt) on the lead detail
  page's phone/email; a new Admin → Audit Log page showing all three logs with a lead-ID filter.
- ✅ Verified end-to-end in-browser: created a lead, confirmed both phone and email showed masked
  in the list *and* detail view, clicked Reveal on phone, entered a reason, watched it flip to the
  real number in place — then logged in as Super Admin and found that exact reveal (with the exact
  reason text), the lead's `created` process-log entry, and the earlier record-open access-log
  entry, all correctly filtered to that one lead.

**Phase 8 — Integrations (Zapier / Make / any external API or form):**

Re-scoped from the original plan's Google Sheets sync (not needed) to a general external-capture
surface — the more broadly useful piece anyway, and what TECHNICAL_SPEC.md §10.3 already called
"a standardized mapping layer" for external booking engines, website forms, or third-party APIs.

- ✅ `api_keys` table (migration `0004`) + `leads.source` column — a completely separate
  credential space from staff JWTs. Keys are SHA-256 hashed (not bcrypt — deliberately: bcrypt's
  slowness defends a low-entropy human password, not a 32-byte random token, where a fast exact
  hash is the correct tool), shown once at creation, never retrievable again.
- ✅ `POST/GET /integrations/api-keys`, `PATCH .../{id}` — Admin/Super Admin manage keys, each one
  bound to an `assigned_agent_id`: leads captured through that key are owned by that agent, the
  same ownership model every other lead already uses. Revocation is a soft `is_active=false`
  toggle, never a hard delete, so the audit trail of what existed survives.
- ✅ `POST /leads/capture` — the external capture endpoint, `X-API-Key` authenticated. Runs through
  the *same* lead-creation path as the in-app intake flow (PRD §4.1) — same duplicate detection,
  same `booking_process_log` write (`action="external_capture"`) — not a parallel implementation
  that could quietly drift from it. Returns a deliberately slim confirmation shape decoupled from
  the internal `LeadRead`, so external integrations don't break if that shape changes later.
- ✅ The endpoint's contract is fixed (`name`/`phone`/`email`/optional `source`/`notes`) — Zapier's
  or Make's own field-mapping UI is what translates an arbitrary external form onto it, which is
  *why* new integrations don't require a rewrite (§10.3's actual point).
- ✅ 8 new passing pytest tests (87 total): key creation/listing/revocation, capture rejecting a
  missing/invalid/revoked key, correct agent attribution, the `source` override, and duplicate
  detection working identically to internal intake.
- ✅ Frontend: Admin → Integrations page — create a key (one-time raw-key reveal, copy-to-clipboard),
  a list with masked prefixes and Revoke/Reactivate, and an inline Zapier/Make setup snippet with
  the actual endpoint URL and example payload.
- ✅ Verified end-to-end, not mocked: created a real API key through the UI, used the actual raw key
  in a `curl` call simulating a Zapier webhook, watched the lead appear correctly in the assigned
  agent's queue with `source` set to the override value and PII still masked, confirmed "last used"
  updated on the admin page, revoked the key through the UI, and confirmed the exact same `curl`
  call then got a clean 401.

**UI/UX redesign + role-based Dashboard** (requested ahead of Phase 9 — "enhance the UI/UX...
make it modern and luxurious... also add dashboard for all Users based on their permissions"):

- ✅ **New design system** (`frontend/app/globals.css`) — a premium travel-CRM palette (deep navy
  `#12172b` + muted gold `#b3872f` accent, warm ivory `#f6f4ef` surfaces instead of stark white),
  with a full dark-mode variant via `prefers-color-scheme`. CSS custom properties registered
  through Tailwind v4's `@theme inline` so the palette is available as ordinary utilities
  (`bg-accent`, `text-ink-muted`, etc.), plus a shared component layer (`.card`, `.btn-primary`,
  `.input`, `.badge`, `.table-modern`, `.nav-link`) so every page draws from one source of truth
  instead of ad hoc Tailwind strings. Soft-tinted status badges (`lib/status-colors.ts` —
  `statusBadgeStyle`) replaced the old solid-fill white-on-color pattern PRD §6.1 originally
  specified literally, for better legibility.
- ✅ **Every page in the app restyled**, business logic untouched: dashboard shell/sidebar
  (`app/(dashboard)/layout.tsx` — dark navy nav with active-state highlighting via `SidebarNav`,
  user avatar, `lucide-react` icons throughout), login and landing pages, Leads list + New Lead
  intake flow, the Lead detail page and all five of its panels (StatusActions, PaymentActions,
  ModificationsPanel, CancellationPanel, RevealField), all three booking forms (Car/Hotel/
  Flight), every Admin page (Users, Audit Log, Integrations + their sub-forms), Future Credits,
  and the public unauthenticated `/authorize/[id]` consent page.
- ✅ **Role-based Dashboard** (`GET /dashboard/summary`, `app/(dashboard)/dashboard/page.tsx`) —
  every role gets a permission-appropriate glimpse of aggregate data on login, not just a list of
  records. Built entirely on top of *existing* authorization primitives rather than a parallel
  access model: lead counts/status breakdown reuse `apply_lead_visibility` (so an Agent's
  dashboard reflects only their own leads, exactly like the Leads list already did), and the
  optional fields (`pending_qc_count`, `pending_payment_count`, `my_processed_revenue`,
  `total_revenue`, `total_users`, `active_integrations`, `future_credits_issued_count`/
  `_total_value`) are populated only for the roles the PRD already grants that visibility to
  (QC for Auditor/TL/Admin/Super Admin, revenue for Billing/TL/Admin/Super Admin, system stats
  for Admin/Super Admin only) — the same 403 boundary enforced everywhere else in the API, not a
  new one invented for this feature.
- ✅ 5 new passing pytest tests (92 total): an Agent's summary contains only their own leads and
  masked recent-lead entries, Billing sees `pending_payment_count` but not admin-only stats,
  Admin sees system stats and `total_revenue`, and the endpoint requires auth like everything else.
- ✅ Verified end-to-end in-browser across a fresh lead's full lifecycle post-redesign: signed in
  as Super Admin, confirmed the Dashboard's 7 conditional stat cards render with real data (Total
  Users: 3), created a lead through the restyled intake flow, completed a car booking through the
  restyled booking form, confirmed every panel on the restyled Lead detail page (status badge,
  booking summary, "Send for customer authorization" link, Modifications, Cancellation) renders
  correctly, and opened the public `/authorize/[id]` page in a fresh tab to confirm the luxury
  palette carries through to the one unauthenticated, customer-facing screen in the app. Also
  spot-checked Admin → Users and Admin → Integrations for the same visual consistency. `npm run
  lint` and `npm run build` both clean (all 21 routes compile) after every page.

**In-app messaging** (requested ahead of Phase 9): a real-time chat system letting every
registered user message every other registered user directly — deliberately independent of the
lead-visibility RBAC model used everywhere else in this app, since messaging is peer-to-peer,
not booking-scoped.

- ✅ New schema (migration `0005`): `conversations`/`conversation_participants` (supports both
  1:1 and group chats — creating a conversation with one other user is idempotent, reusing the
  existing 1:1 thread instead of spawning duplicates), `messages`, `message_attachments`,
  `message_mentions`. Access control is just "are you a participant" — 404s (not 403s) for
  non-participants, the same leak-nothing pattern used for leads.
- ✅ `GET /messaging/users` — directory search open to *any* authenticated user (unlike the
  Admin-only `GET /users`), for starting a conversation or @mention autocomplete.
- ✅ `POST/GET /messaging/conversations`, `GET/POST /messaging/conversations/{id}/messages`,
  `POST /messaging/conversations/{id}/read` — full send/receive/read-receipt lifecycle. Message
  status (`sent`/`delivered`/`read`) is computed from `ConversationParticipant.last_read_at`
  rather than a per-message-per-recipient row; "delivered" means at least one other participant's
  WebSocket was connected at send time — a documented, honest simplification of the same
  single-worker, in-memory `ConnectionManager` built in Phase 4, now also carrying `chat_message`/
  `chat_read`/`mention` events alongside the original status-change notifications.
- ✅ @mentions: the composer inserts a stable `@[Name](userId)` markup into the message body when
  a user is picked from the suggestion dropdown (not fragile text matching), mentioned users must
  already be conversation participants, and each mention writes a `Notification` row + WS push so
  it surfaces in the existing notification bell.
- ✅ File uploads (`POST/GET /messaging/attachments`): JPG/JPEG/PNG/WEBP/PDF only, capped at 8MB,
  validated three independent ways (declared content-type, file extension, and a magic-byte sniff
  of the actual bytes) that all have to agree — catches a mislabeled file without a heavyweight
  scanning dependency. Stored as bytes directly in Postgres rather than an object store, a
  deliberate self-contained tradeoff (documented in `app/models/messaging.py`) that needs zero
  extra infra in any environment this app runs in; swapping in S3/R2 later is a drop-in change to
  one read/write path, not a schema migration. Uploads/downloads go straight from the browser to
  the FastAPI backend rather than through a Next.js Route Handler — the same short-lived-token
  exception the WebSocket connection already uses, reused here so a large upload isn't subject to
  a serverless function's request-body ceiling.
- ✅ "Quick response" — a sender-side toggle that flags a message as needing a fast reply (shown
  as a badge on the message) plus one-click canned quick-reply chips in the composer, covering
  both readings of the requested "option/indicator."
- ✅ 15 new passing pytest tests (107 total): 1:1 idempotency, group creation, mention validation
  (rejects mentioning a non-participant), read-receipt state transitions, unread counts, the
  three-way attachment validation (rejects a mismatched content-type and a disallowed type), and
  that a non-participant gets a 404 on both messages and attachment downloads.
- ✅ Frontend: a new "Messages" nav item visible to every role (with a live unread badge), a
  two-pane inbox (`app/(dashboard)/messages`) — conversation list with search, a user-search
  modal for starting new 1:1 or group chats, and a chat window with mention-highlighted bubbles,
  image thumbnails/PDF file rows, upload progress states, a hand-rolled emoji picker (no external
  dependency), and read-receipt ticks — all built from the existing design system's `.card`/
  `.btn-*`/`.input` classes plus two new bubble classes, no new component library.
- ✅ Verified end-to-end across two real logged-in sessions (Agent and Billing): started a 1:1
  conversation, sent a message mentioning the other user (confirmed the highlighted mention chip,
  the notification bell surfacing it, and the sidebar unread badge), replied with a quick-reply
  chip and the emoji picker, uploaded and sent both an image (confirmed it rendered as a live
  thumbnail via the WebSocket push with no page reload) and a PDF (confirmed the file-name/icon
  row), and confirmed message status flipped sender-side from sent → delivered → read as the
  other participant came online and opened the thread. Caught and fixed one real bug from this
  pass: a low-resolution image was rendering at its tiny natural pixel size instead of filling the
  thumbnail box (missing explicit width/height, only `max-*` bounds) — fixed and reverified.
  `npm run lint`, `npm run build`, and the full 107-test backend suite all clean.

**Floating chat widget + universal message notifications** (follow-up requests on the messaging
feature above):

- ✅ Every message now notifies its recipient(s), not just @mentions. `send_message` writes a
  durable `Notification` row + WS push for every other participant; anyone explicitly mentioned
  gets the more specific "mentioned you" notification instead (never both for the same message).
- ✅ Fixed a real bug this surfaced: the notification bell's `useNotifications` (Phase 4) accepted
  *any* frame off the shared `/ws/notifications` socket unconditionally — since messaging's
  `chat_message` events carry a full message *object* under the same `message` key the bell
  expects a display *string* under, that combination was one chat send away from crashing the
  bell (`{m.message}` rendering an object). Now filtered to only accept string-`message` frames.
- ✅ Bell entries for messages/mentions are labeled and link to `/messages`.
- ✅ A persistent floating chat bubble (bottom-right, unread badge) on every dashboard page except
  `/messages` itself — click to pop out a compact chat panel without leaving what you're doing.
  Reuses the exact same `MessagingApp` component the full page uses (`variant="compact"`) rather
  than a parallel implementation: single-pane (list *or* open thread with a back button) instead
  of the full page's side-by-side layout, since a ~380px-wide floating panel doesn't have room
  for both.
- ✅ Consolidated what had been an ad hoc "one WebSocket connection per consumer" pattern into a
  single shared module-level connection (`lib/messaging-client.ts`) reused by the sidebar badge,
  the floating widget's badge, and any open chat window — added a second badge consumer (the
  widget) without adding a second socket.
- ✅ 1 new passing pytest test (108 total) confirming a plain message and a mention never both
  fire for the same recipient.
- ✅ Verified live: the shared-browser-tab-cookie limitation (documented since Phase 4 — logging
  into a second tab as a different user silently switches the *whole browser's* session,
  including the first tab's) made a clean two-tab notification demo unreliable, so verified the
  live push properly instead with a standalone WebSocket listener authenticated as one user via
  a real token (not a shared browser session) while sending as another via the API — confirmed
  both the `chat_message` and the new `message`-shaped notification frame arrive in real time,
  and that the notification frame's `message` field is a string (i.e., won't hit the bug above).
  Floating widget itself verified in-browser: bubble persists across page navigation, opens a
  working compact panel, starts a new conversation, sends a message, and stays out of the way
  on `/messages`. `npm run lint`, `npm run build`, and the full 108-test backend suite all clean.

Next: **Phase 9 — Hardening & deploy** (see TECHNICAL_SPEC.md §10 for the full phase breakdown).

## Local Development

### Option A — native (what this repo was verified against)

Requires PostgreSQL 16 and Redis running locally (`brew install postgresql@16 redis`, both
started via `brew services start`), with a `crm`/`crm` role and `crm` database already created
(`pgcrypto`, `pg_trgm`, `citext` extensions enabled).

```bash
# backend
cd backend
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
.venv/bin/python -m app.scripts.seed_superadmin --email you@example.com --password 'change-me-123' --name "Your Name"
.venv/bin/uvicorn app.main:app --reload --port 8000

# frontend (separate shell)
cd frontend
npm install
npm run dev
```

Backend: http://localhost:8000/docs · Frontend: http://localhost:3000

### Option B — Docker

```bash
docker compose up --build
```

Spins up Postgres (host port `5433`, offset to avoid clashing with a native install),
Redis (`6380`), the FastAPI backend (`8000`, runs migrations on boot), a Celery worker,
and the Next.js frontend (`3000`).

## Repo layout

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, Celery worker
frontend/   Next.js (App Router) app
docs/       PRD + technical specification
```
