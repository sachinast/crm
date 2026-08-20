--
-- PostgreSQL database dump
--

\restrict svUN4flKn6oh6h7RCJYXVBIWKIV4wMcvi3C204486jKIViumR6FzLJzhgUdOAQ8

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: attachment_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attachment_kind AS ENUM (
    'image',
    'pdf'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'authorization_pending',
    'client_approved',
    'transferred_to_billing',
    'card_charged',
    'card_declined',
    'tag_change_dep',
    'tag_cr_booking',
    'tag_auditor',
    'qc_done',
    'tag_refund',
    'tag_rdr',
    'tag_chargeback'
);


--
-- Name: pii_field; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pii_field AS ENUM (
    'email',
    'phone',
    'card'
);


--
-- Name: service_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_type AS ENUM (
    'car',
    'hotel',
    'flight'
);


--
-- Name: sync_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_status AS ENUM (
    'pending',
    'success',
    'failed'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_notification_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_notification_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    opened_by uuid NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    category text NOT NULL,
    target_type text,
    target_id uuid,
    metadata jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL,
    assigned_agent_id uuid NOT NULL,
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    value_type text NOT NULL,
    category text NOT NULL,
    label text NOT NULL,
    description text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT app_settings_value_type_check CHECK ((value_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'json'::text])))
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    work_date date NOT NULL,
    check_in_at timestamp with time zone NOT NULL,
    check_out_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: authorization_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorization_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    cardholder_confirmed boolean NOT NULL,
    prepaid_charge_ack boolean NOT NULL,
    pay_at_counter_ack boolean NOT NULL,
    booking_details_ack boolean NOT NULL,
    terms_ack boolean NOT NULL,
    non_refundable_ack boolean NOT NULL,
    consent_status text DEFAULT 'authorized'::text NOT NULL,
    customer_ip inet NOT NULL,
    user_agent text NOT NULL,
    authorized_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_modifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_modifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    field_name text NOT NULL,
    original_value jsonb NOT NULL,
    revised_value jsonb NOT NULL,
    modification_amount numeric(12,2) DEFAULT 0 NOT NULL,
    modified_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_process_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_process_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    action text NOT NULL,
    field_changed text,
    old_value jsonb,
    new_value jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cancellations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cancellations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    original_prepaid_amount numeric(12,2) NOT NULL,
    cancellation_penalty_fee numeric(12,2) DEFAULT 0 NOT NULL,
    refund_amount numeric(12,2) GENERATED ALWAYS AS (GREATEST((original_prepaid_amount - cancellation_penalty_fee), (0)::numeric)) STORED,
    final_retained_amount numeric(12,2) GENERATED ALWAYS AS (LEAST(cancellation_penalty_fee, original_prepaid_amount)) STORED,
    cancelled_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: car_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    booking_reference text NOT NULL,
    booking_platform text NOT NULL,
    car_provider text NOT NULL,
    renter_dob date NOT NULL,
    transmission text NOT NULL,
    fuel_policy text,
    vehicle_type text NOT NULL,
    pickup_datetime timestamp with time zone NOT NULL,
    pickup_location text NOT NULL,
    return_datetime timestamp with time zone NOT NULL,
    return_location text NOT NULL,
    prepaid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    pay_at_counter_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) GENERATED ALWAYS AS ((prepaid_amount + pay_at_counter_amount)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_fields jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_participants (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    last_read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_group boolean DEFAULT false NOT NULL,
    name text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_field_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_field_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    field_type text NOT NULL,
    options jsonb,
    is_required boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_field_definitions_entity_type_check CHECK ((entity_type = ANY (ARRAY['lead'::text, 'car_booking'::text, 'hotel_booking'::text, 'flight_booking'::text]))),
    CONSTRAINT custom_field_definitions_field_type_check CHECK ((field_type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'checkbox'::text])))
);


--
-- Name: embed_widgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.embed_widgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    widget_key text NOT NULL,
    assigned_agent_id uuid NOT NULL,
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    submission_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: file_share_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_share_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    share_link_id uuid NOT NULL,
    event_type text NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT file_share_events_event_type_check CHECK ((event_type = ANY (ARRAY['view'::text, 'click'::text])))
);


--
-- Name: file_share_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_share_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_id uuid NOT NULL,
    token text NOT NULL,
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by uuid NOT NULL,
    file_name text NOT NULL,
    content_type text NOT NULL,
    kind text NOT NULL,
    size_bytes integer NOT NULL,
    data bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flight_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flight_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    booking_reference text NOT NULL,
    pnr text NOT NULL,
    airline text NOT NULL,
    flight_numbers text[] NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    cabin_class text NOT NULL,
    prepaid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    pay_at_counter_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) GENERATED ALWAYS AS ((prepaid_amount + pay_at_counter_amount)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    booking_platform text NOT NULL
);


--
-- Name: future_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.future_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_lead_id uuid NOT NULL,
    voucher_amount numeric(12,2) NOT NULL,
    number_of_vouchers integer DEFAULT 1 NOT NULL,
    validity_date date NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: google_sheets_sync_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_sheets_sync_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    table_name text DEFAULT 'leads'::text NOT NULL,
    status public.sync_status DEFAULT 'pending'::public.sync_status NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hotel_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    booking_reference text NOT NULL,
    booking_platform text NOT NULL,
    hotel_name text NOT NULL,
    room_type text NOT NULL,
    location text NOT NULL,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    prepaid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    pay_at_counter_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) GENERATED ALWAYS AS ((prepaid_amount + pay_at_counter_amount)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT hotel_bookings_check CHECK ((check_out_date > check_in_date))
);


--
-- Name: lead_access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_access_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    user_id uuid NOT NULL,
    granted_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    email public.citext NOT NULL,
    service_type public.service_type,
    status public.booking_status DEFAULT 'authorization_pending'::public.booking_status NOT NULL,
    agent_id uuid NOT NULL,
    is_duplicate boolean DEFAULT false NOT NULL,
    duplicate_of_id uuid,
    duplicate_override_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source text,
    custom_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    embed_widget_id uuid,
    landing_page_url text,
    visitor_public_ip text,
    visitor_local_ip text,
    embed_submission jsonb
);


--
-- Name: master_field_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_field_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_key text NOT NULL,
    value text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid,
    uploaded_by uuid NOT NULL,
    file_name text NOT NULL,
    content_type text NOT NULL,
    kind public.attachment_kind NOT NULL,
    size_bytes integer NOT NULL,
    data bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text,
    is_quick_response boolean DEFAULT false NOT NULL,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    recipient_user_id uuid,
    type text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient_role_id uuid
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    prepaid_amount numeric(12,2) NOT NULL,
    pay_at_counter_amount numeric(12,2) NOT NULL,
    total_amount numeric(12,2) GENERATED ALWAYS AS ((prepaid_amount + pay_at_counter_amount)) STORED,
    card_last_four text,
    card_token text,
    outcome text DEFAULT 'pending'::text NOT NULL,
    processed_by uuid,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pii_reveal_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pii_reveal_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    field_revealed public.pii_field NOT NULL,
    reason text NOT NULL,
    ip_address inet NOT NULL,
    user_agent text NOT NULL,
    revealed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_system_role boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    from_status public.booking_status,
    to_status public.booking_status NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: status_lookup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_lookup (
    status public.booking_status NOT NULL,
    label text NOT NULL,
    ui_color text NOT NULL,
    sort_order integer NOT NULL
);


--
-- Name: status_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_role_permissions (
    status public.booking_status NOT NULL,
    role_id uuid NOT NULL,
    kind text NOT NULL,
    CONSTRAINT status_role_permissions_kind_check CHECK ((kind = ANY (ARRAY['set_by'::text, 'notifies'::text, 'relevant'::text])))
);


--
-- Name: user_whitelisted_ips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_whitelisted_ips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ip_address inet NOT NULL,
    label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email public.citext NOT NULL,
    password_hash text NOT NULL,
    ip_whitelist_enabled boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role_id uuid NOT NULL
);


--
-- Data for Name: access_notification_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.access_notification_log (id, lead_id, opened_by, opened_at) FROM stdin;
e6cd7fa9-fe81-444c-903b-b7449ceef798	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 05:58:32.895966+00
75363f3e-5bf9-4830-b2d8-9824db010402	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 05:58:37.265378+00
700786b5-413a-4fb0-83cc-0bd9eba718ab	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 05:59:17.218129+00
f04cf08f-e7a4-4590-a45a-0edbb2baf0d0	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 05:59:17.43394+00
54f5c487-4b47-45b9-a5a8-79a376e33539	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:51:43.930417+00
27b77d66-9db7-4127-a0a6-ddd3bd47637c	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:51:57.154185+00
95d224a9-075d-4ded-afc5-8ead43bb680c	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:54:12.574187+00
7beafd80-84d0-46ac-9e23-68c8eb93e026	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:54:12.583041+00
e9ffd5b9-d3e9-4715-b6f0-e4517049127e	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:54:13.679209+00
74ab3944-4e9b-4e1d-9ee3-fd386698cacd	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:56:41.651375+00
5e44f521-af35-4f67-a603-5824f2cb9a93	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:57:09.522805+00
b1169121-9177-4207-a8f7-5db704962a4e	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:57:19.195063+00
781d0b95-0cf5-4720-8d9b-287855f133e2	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:57:25.916767+00
08815dea-b1f3-45ba-bad4-747196279dd8	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 17:02:43.610565+00
317f3068-7cf0-4268-85cf-cf6dfb4f0890	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 17:02:46.879816+00
36f9eb30-5cef-41a6-bf6e-fd9fd1f8bd2e	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 17:03:16.721417+00
cc3686c2-9b5c-47a6-8b6d-567e93918e75	3fd31619-366c-40f6-a104-1d7e46a528bb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 17:03:47.990131+00
b71d3d01-58ad-44d2-92b7-3326c3bb4d33	3fd31619-366c-40f6-a104-1d7e46a528bb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 17:03:51.326109+00
ea23da53-42e5-4e4a-ab92-766786d899a0	3fd31619-366c-40f6-a104-1d7e46a528bb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 18:44:24.760259+00
d4228c2f-45a5-4f88-b828-e660159c804a	0b70bbcc-85c7-4934-bd79-4c14b575b15b	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 20:36:05.528994+00
8b4fb77b-8741-496b-ac30-837d4194e026	0b70bbcc-85c7-4934-bd79-4c14b575b15b	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 20:36:09.674675+00
6e45aa8b-cda6-405f-b654-24f7d11ab1d4	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	2026-08-18 20:37:08.412958+00
a6fdc42b-f1c4-42ad-990c-cc54facd7d73	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	2026-08-18 20:37:12.782873+00
b8ca6022-3295-4adc-9b27-6a83e386e606	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	2026-08-18 20:37:59.331634+00
a4d68023-e2b2-452d-9789-fdc17ff9b592	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	2026-08-18 20:37:59.370514+00
6f95db08-661e-44b0-8204-14e12550d49b	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	2026-08-18 20:38:06.323974+00
7bed1a5a-d728-40e0-b765-5f4b406b49b9	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	2026-08-18 20:38:16.102601+00
7fc19229-9651-4f7a-b8cf-2ed2dd82edfb	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 20:39:18.4533+00
6180cb15-8078-4633-9d24-39d6a8abeb6f	0b70bbcc-85c7-4934-bd79-4c14b575b15b	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 14:08:00.896398+00
068c18c7-aabb-40ce-be87-f9b65afde7c4	7a8eb954-1485-4683-b4de-641ff66af140	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 16:43:50.832754+00
cf14c184-f686-41db-8b69-3a48ef46e1a5	7a8eb954-1485-4683-b4de-641ff66af140	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 16:44:03.406356+00
e2eb884f-41e4-4ebf-9c7a-b66cd5a7d9eb	7a8eb954-1485-4683-b4de-641ff66af140	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 16:56:02.004473+00
1264c1e8-315f-43c6-96de-4920117719ef	7a8eb954-1485-4683-b4de-641ff66af140	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 16:56:08.235693+00
b5f7bad2-c4c9-4162-914c-621782eb6869	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 16:57:27.93014+00
522f093e-c08a-4d8e-9799-c47a98eb6e43	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 16:58:10.208474+00
b12fdf0f-e257-4b4d-ba02-fb78be51dba0	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 16:58:28.859665+00
c3f071d5-9167-4ceb-bc5a-e339299857a8	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 16:58:33.042854+00
77b05fbf-0e38-4497-843a-aeb072815c5b	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:00:41.768842+00
3a23dbd9-4471-4eb7-860f-b855940d45b9	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:01:29.852422+00
f99a4673-079f-4608-a520-ac1242135118	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:01:32.204406+00
166e2914-4fb0-437b-abeb-66c2a6a869c0	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:05:07.221396+00
83ea35e7-9357-45e6-96e4-bf92eeb25333	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:05:11.791099+00
287f24f3-8601-4fc2-91b7-04b23ecebd63	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:05:15.511685+00
d4a2d4f7-ba76-4528-8ccf-f04d30f47101	7a8eb954-1485-4683-b4de-641ff66af140	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:05:21.55079+00
7225f446-e15c-4193-a40f-bb5b7516cc1d	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:05:22.560633+00
f08e4672-7b28-4af4-99f0-14d6f8243a6b	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:05:28.610666+00
533efc02-3195-42e5-a4bc-7a1a9b2093f2	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:05:31.133505+00
b5c37155-2842-4e0e-a4d6-a6b339b0ae80	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:06:09.978523+00
ea83b940-0894-42b5-96ed-06d9be44e58e	5a8c400b-e6fe-449b-b850-58d0b05dbda8	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:06:37.170013+00
85213259-eaf1-4d23-93b6-aa1f2b8d6150	5a8c400b-e6fe-449b-b850-58d0b05dbda8	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:06:42.40435+00
becef0c3-3c03-48ea-b5b4-809ae2ea3c27	3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:07:31.008029+00
877b9e7c-825b-46d4-92ff-a93c74cccefb	3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:07:33.798363+00
cba77895-3c54-4983-a452-c13d496fb5d2	3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:09:59.155952+00
b9ee1bd1-cdc2-4efe-ba40-c05ac2eb0568	f0d0d12f-5bf9-4006-accf-48685285ce94	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:12:39.287758+00
2fe71df3-f1a7-411c-a18c-a9c671744677	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:19:14.991317+00
b878c96b-864e-4489-818f-ea7602d225b7	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:19:17.537541+00
\.


--
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_log (id, actor_id, action, category, target_type, target_id, metadata, ip_address, user_agent, created_at) FROM stdin;
71377cd4-893d-45fd-a92d-0d137f97c12e	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	44.205.9.241	node	2026-08-18 20:33:19.394987+00
6f34ef14-9f4a-4e8c-ac0b-70d055ba6dc7	87a4b8b0-763c-4633-9f59-623d53ecd5a8	conversation_started	messaging	conversation	340b2395-281b-4398-8c76-7dd802add2ab	{"is_group": false, "participant_count": 2}	\N	\N	2026-08-18 20:34:49.898157+00
43ad0a58-bca7-480a-a86c-1e20ab5f250e	2d9c46e3-168b-4bf0-93eb-bb8664075de4	login_success	auth	\N	\N	null	44.205.9.241	node	2026-08-18 20:36:37.819335+00
a411c1b4-a6e1-4ca5-8905-bcbf006aefea	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	18.232.66.91	node	2026-08-18 20:39:03.653955+00
ba9d0e12-9582-46c9-9f44-90efe892a898	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	login_success	auth	\N	\N	null	18.232.66.91	node	2026-08-18 20:40:45.184064+00
0fc12f21-b801-41da-aec7-fe14113a10bc	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	54.152.202.96	node	2026-08-18 21:37:41.583326+00
0847ba99-4c28-4814-80be-fb73b820ca6e	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	3.88.112.150	node	2026-08-18 23:13:48.564653+00
44140550-4ce1-463c-b78c-8aedd196fcbd	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	3.88.112.150	node	2026-08-18 23:13:55.499116+00
ed4b0ee0-ea01-4a62-adf3-ed0993b296da	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	54.160.220.18	node	2026-08-18 23:14:07.817846+00
08bcec6a-f08c-4921-8bd4-ded873fa4e01	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	3.88.112.150	node	2026-08-18 23:14:16.295421+00
e84993d3-6c01-45e8-9493-15e2ddd2d376	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	13.220.253.28	node	2026-08-19 08:10:27.844097+00
3c9838f4-94bc-4cda-8fd3-9929a95c6825	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	18.206.97.185	node	2026-08-19 14:07:57.359676+00
6e69d15d-12b5-46df-ac61-8cda9e6d34db	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	18.206.97.185	node	2026-08-19 14:07:58.947726+00
8bb94d58-fdcb-41ac-86f6-4cb8970bbda3	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	34.201.9.248	node	2026-08-19 16:32:32.278601+00
b4cc940a-6864-44a1-990e-096c649bfac6	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	98.86.242.67	node	2026-08-19 16:50:46.892078+00
dd9f978a-9512-4672-bce1-a5deafe36607	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	98.86.242.67	node	2026-08-19 16:54:09.249734+00
c2d76073-5947-4c64-8fd2-4050d3d3a251	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	98.86.242.67	node	2026-08-19 17:06:30.405423+00
b7f3c610-77fd-4855-bbc6-77f390088ce3	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	98.86.242.67	node	2026-08-19 17:06:33.37731+00
c58d0de1-afbc-472a-9316-4b562de12e39	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	98.86.242.67	node	2026-08-19 17:09:35.145995+00
06f2291b-f88f-4594-aa78-f087736daf38	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	98.86.242.67	node	2026-08-19 17:09:38.730157+00
645cee80-8219-45b0-8e57-839489f6166d	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	54.234.178.241	node	2026-08-19 17:38:03.708317+00
ef89727e-ef32-43d9-ae68-6861c2e1169e	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	52.201.11.28	node	2026-08-19 17:56:45.496551+00
0ce1482b-f497-4160-8c23-9cd9117553a2	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	54.164.25.47	node	2026-08-19 18:28:00.362575+00
d90c14db-52b1-432c-bbdb-2880389d0331	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	54.164.25.47	node	2026-08-19 18:28:03.925649+00
09b41f7a-27a1-41f1-9f3c-930924e65e29	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	100.28.130.198	node	2026-08-19 18:47:07.687146+00
2c182a19-2ae5-4cac-b0f3-3815180cc848	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	100.28.130.198	node	2026-08-19 18:47:10.637594+00
b34e2fdb-441a-4044-806b-bc960f82f995	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	13.217.96.174	node	2026-08-19 19:11:46.441911+00
a72e2ee3-7661-4a58-9a4e-45291536645f	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	13.217.96.174	node	2026-08-19 19:27:00.066502+00
33337ab3-5b22-4940-9f93-887273f1a872	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	13.217.96.174	node	2026-08-19 19:27:00.69776+00
7c8c0b94-531a-4fa9-8995-e964610b815d	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	18.212.154.215	node	2026-08-19 19:47:16.065142+00
46b0b17c-c2b4-48ee-9357-e4e211e942ec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	3.236.123.17	node	2026-08-19 20:02:48.721334+00
b0c34d32-b939-4de2-9ea6-9ad0403a6fa5	87a4b8b0-763c-4633-9f59-623d53ecd5a8	login_success	auth	\N	\N	null	44.211.75.127	node	2026-08-19 20:33:36.435396+00
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
0014
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.api_keys (id, name, key_prefix, key_hash, assigned_agent_id, created_by, is_active, last_used_at, created_at) FROM stdin;
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_settings (key, value, value_type, category, label, description, updated_by, updated_at) FROM stdin;
registration_enabled	false	boolean	General	Self-registration enabled	Not currently enforced anywhere — no public registration endpoint exists (PRD §3: all accounts are provisioned by an Admin/Super Admin). Kept for forward-compatibility.	\N	2026-08-18 03:19:01.613931+00
messaging.max_file_size_mb	8	number	Messaging	Max attachment size (MB)	Caps message attachment uploads. Attachments are stored as bytes in Postgres, so this also bounds row/TOAST size — raise it only alongside a move to real object storage.	\N	2026-08-18 20:32:48.301192+00
messaging.quick_replies	["👍 Got it", "✅ On it", "🙏 Thanks!", "⏳ One sec"]	json	Messaging	Quick reply presets	Chips shown above the message composer.	\N	2026-08-18 20:32:48.301192+00
files.max_file_size_mb	50	number	Files	Max file upload size (MB)	Caps uploads in the Files module. Files are stored as bytes in Postgres, so this also bounds row/TOAST size.	\N	2026-08-19 19:47:03.366613+00
header_clocks	[{"label": "India", "enabled": true, "timezone": "Asia/Kolkata"}, {"label": "New York", "enabled": true, "timezone": "America/New_York"}, {"label": "London", "enabled": true, "timezone": "Europe/London"}]	json	General	Header world clocks	Up to 3 clocks shown in the top header (next to the notification bell) — each user chooses individually whether to show them.	\N	2026-08-19 19:47:03.366613+00
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance_records (id, user_id, work_date, check_in_at, check_out_at, notes, created_at) FROM stdin;
bd36f69d-27d5-4595-bdd1-4aadcb6e8d46	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19	2026-08-19 19:51:29.399892+00	2026-08-19 19:51:38.563701+00	\N	2026-08-19 19:51:29.396012+00
\.


--
-- Data for Name: authorization_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.authorization_records (id, lead_id, cardholder_confirmed, prepaid_charge_ack, pay_at_counter_ack, booking_details_ack, terms_ack, non_refundable_ack, consent_status, customer_ip, user_agent, authorized_at) FROM stdin;
8c542186-6d18-4f87-93dc-0fc5f953650e	6c07443d-6bdb-47b1-87ed-e65618455fec	t	t	t	t	t	t	authorized	223.236.199.143	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	2026-08-18 16:54:50.760304+00
\.


--
-- Data for Name: booking_modifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.booking_modifications (id, lead_id, field_name, original_value, revised_value, modification_amount, modified_by, created_at) FROM stdin;
\.


--
-- Data for Name: booking_process_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.booking_process_log (id, lead_id, actor_id, action, field_changed, old_value, new_value, created_at) FROM stdin;
163eae9d-517e-4176-9263-c12fd8689871	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-18 05:58:29.729589+00
713780bd-c3d7-4b08-9ec0-0ee0b904082d	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"car"	2026-08-18 05:58:32.430976+00
d098f8e1-42eb-4c9d-b1fd-44fc9f23b00a	8bce810b-ca4d-4252-9fcf-43c05d250ff2	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-18 05:59:53.123685+00
b7f1189f-a197-4ccf-90c4-fdc249f46ded	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-18 16:51:36.098584+00
871b419c-30f3-4c68-8112-9c10e1615c45	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"car"	2026-08-18 16:51:43.520288+00
3bf5404c-21d5-415a-bd22-85bb2d00a5f9	6c07443d-6bdb-47b1-87ed-e65618455fec	87a4b8b0-763c-4633-9f59-623d53ecd5a8	status_change	status	"authorization_pending"	"client_approved"	2026-08-18 16:54:50.760304+00
072a2345-80f3-48e7-8792-97d4df10a842	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-18 17:02:38.366702+00
03f470af-d8a4-42af-a83b-392afd5c1977	7590aa2e-16ba-4096-a11f-016ceee5f059	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"hotel"	2026-08-18 17:02:43.216946+00
a5316572-124f-4184-976c-972ea6f25ac2	3fd31619-366c-40f6-a104-1d7e46a528bb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-18 17:03:34.915522+00
771292a1-8910-4d7d-93ee-0f54c2a2cb23	3fd31619-366c-40f6-a104-1d7e46a528bb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	duplicate_override_reason	null	"iisis"	2026-08-18 17:03:45.95586+00
6a84f4c6-6b0d-4d7a-86a5-677ad427b876	3fd31619-366c-40f6-a104-1d7e46a528bb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"car"	2026-08-18 17:03:47.58948+00
a381688d-e25b-4464-92ff-f40b9557f701	0b70bbcc-85c7-4934-bd79-4c14b575b15b	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-18 20:36:01.675033+00
b7c964d8-c715-4b3c-a963-72a984de79b7	0b70bbcc-85c7-4934-bd79-4c14b575b15b	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"car"	2026-08-18 20:36:05.023593+00
36a6d234-ed79-44f8-8e52-c18abf6aeb64	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	created	\N	null	null	2026-08-18 20:37:05.443762+00
0326e5da-52af-4b7d-a1e5-e4d97af7f586	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	field_update	service_type	null	"car"	2026-08-18 20:37:07.752736+00
a73702ad-8ace-4144-8fab-45ede408a9f1	7a8eb954-1485-4683-b4de-641ff66af140	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-19 16:42:29.231418+00
05a7f9d4-8ce2-4ca1-a806-3a28c97b9369	7a8eb954-1485-4683-b4de-641ff66af140	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"car"	2026-08-19 16:43:50.274152+00
21a12d4a-d40d-4d0b-8840-29cfa3640a8e	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-19 16:57:23.13366+00
7c085dc4-4d12-4daf-bcfc-9d9ba24310ed	57654d18-2234-4048-977e-71345c99cd68	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"car"	2026-08-19 16:57:27.512962+00
64f9362b-8c68-448b-86fa-010249b44ff7	5a8c400b-e6fe-449b-b850-58d0b05dbda8	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-19 17:06:30.807884+00
d00b274d-6ccf-425c-bfe8-88ca664069a0	5a8c400b-e6fe-449b-b850-58d0b05dbda8	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"flight"	2026-08-19 17:06:36.538423+00
a04d5f25-f703-4b07-ac2d-4192ee475e18	3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-19 17:07:28.303253+00
2d8121f1-2b45-4592-ac07-47964e10fe66	3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"flight"	2026-08-19 17:07:30.580078+00
85ca9f69-0895-43b9-b7f8-9eea18ade6ff	f0d0d12f-5bf9-4006-accf-48685285ce94	87a4b8b0-763c-4633-9f59-623d53ecd5a8	created	\N	null	null	2026-08-19 17:12:15.169156+00
d473bd1c-13d0-421c-b824-81c3d440b028	f0d0d12f-5bf9-4006-accf-48685285ce94	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	duplicate_override_reason	null	"dfdff"	2026-08-19 17:12:32.885165+00
3c30333b-151b-4f71-a89c-01e6dc374474	f0d0d12f-5bf9-4006-accf-48685285ce94	87a4b8b0-763c-4633-9f59-623d53ecd5a8	field_update	service_type	null	"flight"	2026-08-19 17:12:38.791496+00
\.


--
-- Data for Name: cancellations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cancellations (id, lead_id, original_prepaid_amount, cancellation_penalty_fee, cancelled_by, created_at) FROM stdin;
\.


--
-- Data for Name: car_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.car_bookings (id, lead_id, booking_reference, booking_platform, car_provider, renter_dob, transmission, fuel_policy, vehicle_type, pickup_datetime, pickup_location, return_datetime, return_location, prepaid_amount, pay_at_counter_amount, created_at, updated_at, custom_fields) FROM stdin;
bd7e2c2e-f2b9-43d2-898b-37b41821c001	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	kk	kjkj	kjkj	2026-08-19	manual	llk	full_size	2026-08-20 11:29:00+00	ddd	2026-08-28 11:29:00+00	ddd	2.00	2.00	2026-08-18 05:59:16.777588+00	2026-08-18 05:59:16.777588+00	{}
4d2a5f00-342f-455b-9e3a-111111b6b417	6c07443d-6bdb-47b1-87ed-e65618455fec	kjjkj	kjjj	kjjk	2026-08-19	manual	kjkjkj	full_size	2026-08-19 22:23:00+00	kkjkj	2026-08-20 22:23:00+00	nnjnjn	10.00	9.00	2026-08-18 16:54:11.093067+00	2026-08-18 16:54:11.093067+00	{}
3e13dcac-15f5-4fde-995e-783f18978ce1	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	kjkjkj	kjkj	kjkjkjkj	2026-08-19	manual	erre	economy	2026-08-21 02:07:00+00	rere	2026-08-28 02:07:00+00	erer	10.00	78.00	2026-08-18 20:37:58.804847+00	2026-08-18 20:37:58.804847+00	{}
\.


--
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversation_participants (conversation_id, user_id, last_read_at, created_at) FROM stdin;
340b2395-281b-4398-8c76-7dd802add2ab	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	2026-08-18 20:41:12.989251+00	2026-08-18 20:34:49.898157+00
340b2395-281b-4398-8c76-7dd802add2ab	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 17:11:17.002271+00	2026-08-18 20:34:49.898157+00
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, is_group, name, created_by, created_at) FROM stdin;
340b2395-281b-4398-8c76-7dd802add2ab	f	\N	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 20:34:49.898157+00
\.


--
-- Data for Name: custom_field_definitions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.custom_field_definitions (id, entity_type, key, label, field_type, options, is_required, display_order, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: embed_widgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.embed_widgets (id, name, widget_key, assigned_agent_id, created_by, is_active, submission_count, created_at) FROM stdin;
807e1f28-f5e3-48ec-ba4e-70f887df68fa	Form Integration	wgt_IzXNzI7D32UG6v24_iEDYQ	87a4b8b0-763c-4633-9f59-623d53ecd5a8	87a4b8b0-763c-4633-9f59-623d53ecd5a8	t	0	2026-08-19 20:34:05.193588+00
\.


--
-- Data for Name: file_share_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_share_events (id, share_link_id, event_type, ip_address, user_agent, created_at) FROM stdin;
b258f43b-d9fb-4f3a-802e-2005c8be44c3	af37622c-07fe-42b6-934c-006da661a05f	view	98.91.204.59	node	2026-08-19 19:50:33.828109+00
\.


--
-- Data for Name: file_share_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_share_links (id, file_id, token, created_by, is_active, created_at) FROM stdin;
af37622c-07fe-42b6-934c-006da661a05f	7bef9827-f975-45dd-bd52-195886961869	cMvTmoHWvgy7yIFy0Q9lh6_QZgWhRzlX	87a4b8b0-763c-4633-9f59-623d53ecd5a8	t	2026-08-19 19:50:01.269807+00
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.files (id, uploaded_by, file_name, content_type, kind, size_bytes, data, created_at) FROM stdin;
7bef9827-f975-45dd-bd52-195886961869	87a4b8b0-763c-4633-9f59-623d53ecd5a8	WhatsApp Image 2026-08-19 at 14.19.11.jpeg	image/jpeg	image	47813	\\xffd8ffe000104a46494600010100000100010000ffdb008400040505090609090909090a0809080a0b0b0a0a0b0b0c0a0b0a0b0a0c0c0c0c0d0d0c0c0c0c0c0f0e0f0c0c0d0f0f0f0f0d0e1111110e1110101113111311110d01040404080608070808070806080608080807070808090707070707090a0908080808090a0908080608080909090a0a09090a0809080a0a0a0a0a0e100e0e0e77ffc20011080299064003012200021101031101ffc4010900010100030101010000000000000000000001020305040607010101010101010100000000000000000000010203040506100001020303080804030703030500000000010203111204052006101321303151611415323341527172162240a181b1b2234250738291c13443d10724625363c2e1f011000103020205090506050402030000000001021103120491101314307105213132334081c1f0205060b1d141707282a1e122425161c21592a2b2629352d2d31200020101040a0301010101000000000000110110213161f020304041517191a1b1d15081c1e16070f11300020102050305010003010100000000000111102120314151613071b1408191a1f0c150d1e1f160ffda000c03010002000311000002f92b194a00000000000008b1160000020598d800200000000550800000010041609052c141004a0a010008014405ca652cc766b22cb02960b2c165200002c02c0002a0a08a000000165000002a5932964a800b2800000011651294100ab000b0014100000b050580b28648c5942678e58dfd33afc8ebe9dfe3765f46000000000000010080000104b89029000000000b0676652e132c6ca08400b0008b012c0160b000950a94a8104a9680a96502e5858cb19482c828000000002a0b0000160a9400000001400005162112ac05828000000160a828800005000016522c160a08b0582800b96033b858b94cb0d7e95d7e475f56bf1bb2fa30000000000000089698ad31511449942639e262a592aa3218b244518b212643164160b8d11442925114451264315598a88a2288a204148a228c59402821616ca0a22c22ac802880148a2288a2288a2288a25000000028288a2015492c2288a00148b00052288a2289400148a88b0148a25524a58a094009400058160bb756dc35fa575f93d6d37f1bb2fa3200000000032b31b6d4b49142511445114638e7898a88a2321264316431642288a5932262c862c862c862c862c862c862c863364ad6ce262c862c860cc60cc60cc60cc9833958b218b2b1832b58334b85ca98b31ad98c190c666b3066306630663066306630663066306630674c198c198c590c198c198c198c19d3066306630665c2e431998d6d91306630b90c598c198c190c598c198c19a5c198c19ab0b90c590c59231643164316431b69863b31970670c665222c550000000bb35edc35fa5f5b93d6d37f1bb2fa3200000000cac6459105440285841601031b041483280b054864c68b8d2b11931a0150541588c905634a832885888459501115155064c464c464c464c46482a0b70a66c61931866c1666c299311930195c464c464c464c464c464c464c464c464c466c064c46483262326233625c988c98d8c9012152564c464c464c4993119312e4c46482a22a0a82a0a82a0a88a82a0c98daa925cae36c63b315c16621560000006fd1bf0d7e95d6e57574dfc6ecbe8c800000025cf1cf29314055160420a20b00412e20081651282580000028216000059605854a085809490542c905000000014004b05b2925114050200000000000000000b0b52a000b4002c19488020a00000059600000000000002000165b650942e586498e3b30972c56588000051bb46fc35fa5f5795d5d37f1bb8e5e8c8000002ca99cb8e520502e58e50c32d6540415155109601400080509923159405b28c73c0b00001650400000044b011000028000000002d800148a22ca0400000000000054160a094000165500001288b00000005828800000000000200b2c14b4010aa8cb0ca56332c7102800504f479fd386bf48eb72baba6fe3697d19a0000019e19d996bdbaac11488cb2c2c4c6ca0000a08100a012c005529231a9402ca5c6c000005828200028800480810000280000000582a5160a82a5a25204000000000b000500000094585a414009650080000000a800b66518ac000000014014080a80ce18ad99d6ac73c201400007a7cfe8c37fa4f5795d5d2fc6b2c72f464b02c0001b35e7665ab6eab12c9482d820042a2a902c000040002d82c400016512c0000002888b2960b000012c48b004002800052288059425000b00000000000000000b2c00a828094585a94009480000000000000588a428000000502809410b01623667af34c30b8a84a00005f4f9bd5af7fa3f5b95d5d4fc672c72f462cb16c0a0b32c067af659969dba6ca8508b2c04ab28805948b00008000525800005250928148a22fa71be7ddeff5f9baf22fd067a3a7cdbe911f36fa41f36fa587cdbe947cd3e947ccbe9a1f34fa687ccbe987ccbe995f333e9a9f317e9a9f30fa71f2f7e9c7cc3e9c7cbbea07cc4fa7a7cbbea314f98d7f4be5db8e0ce878bd7c301b320002864305100016002c0000001505b0a2900b00001284a0000000005845415280000a058148581600b173c72b35e3963284a00005f5797d5af7fa475797d5d4fc632c6fa314280b05c6c19ebceccb56dd56028010965596002c165800025100b28994882800160a010a9b65dfd09e9f0f77a34f93cfbec65c361aede5c2b1dcc78a3b77874edb888ed65c4876dc4a765c5a76a71476af1076af14766f169d97169d99c71d9714769c61d97169d99c71d3d5cfd9b33b3c7ed6ee7f3b874b9dd1f3c56ccc50b2c651220c80250964000000000014280000215000b00148500000010000b284aa0000000002973c6a618e58ca1280cb1dd1af1cb11ecf27af0dfe91d5e57575bf18cb1cb7e0142900419ebcd33d5b75500004414b00000000004582c19e000000000408e8f3bb5a7afb37ccf93e8f9cf22767c952e50b14bebc6f92757c98df2b7f425e4ceef8f1bcebeaf7e4e363dcf1c9e074b69c77afcdb7188cb361550960105415054177f9ee3aef7b79dd3e5fafcbc0fabf98f470d03dfc02800000004b200000000000a95400004b0000016512810b016500080000559400000055892ca032ca54c31cb194250160b01edf17b75eff0048ea733a7adf8c65865bf0b16db2c62412e25cf5ecacf56dd56085b32892c10a00000000001000012845250110001dfe077fcddfa2cf0e3fa3e3c7d0785e99ded1d7c3e6fa6c7c1dbe6bb3e2e9e777f97ab873ba713dd87b36cc27ab0f3efc1b3dd8e53463e8cb172bd1bf6ec9cee577fc3e8e3c0f3f4f99d8f286dc80040050000476bb1c7ed71fdf7e53eafe53671f3c3abe4a282004002a0b0520a020b0160582a5014002d812c825a20a96160b00000002a550000160a9400002a000a8cacb6618658cb44a00003dbe2f76bdfe91d4e674b5bf17cb1cb7e04b6dc51641b35e580d9af6567ab6e9b9a15962040000000000002012c1512a5045594410001dfe077bcddfab8e58f1fd3f1b9e37bfe0eafd0fce7d0727ddd1b8391d7879e89d5e3d6dde4f5f3faf83dbe1f6e4c376335ebd9e7dbab079376336e663a75eecf47cfb73d5781c7fa9e3767c9cb1d1f380040050000476bb3c6ecf1fdf97ca7d5fca6ce3e65f6757c5e5f474fd5b7c1cadbd5cf6f9790ecdcf1c57695c59da2f16f662f19d91c79d82f1ef5e2f21d78bc975cbc7bd7adf1dd84d71dd8b6f15da35c6764bc69da35c6bd82f19d92f19d935c6768bc5768d719d94bc69db5d715da4bc69d92f1af6575c69da8bc6764bc6bd935c67612f1b5f6f59c1d1f41e6d6e1bdfe2d19c52e11142500032846565b35e394942500001eef0fbf5eff47ea72fa7adf8be5865bf3620025100d9af6567ab6e9b9a45a04b0000028200000a8c594a804a49605816000001dff9feff009fbf5b1b38be9f8d1f43e0dbdae06fd3d7e99c5d1e2eb8f4b89edf672eff00ab91399e8f4fb383d25eaebf2e8f36fa138decce747568f16331bc8ddd3e1f47b78be8f176f6717d5c5f570f3a3a9e6a8000000a0023b3d9e2f638feed9f2ff4dcadbe5d1d4cfd5defccebddbb6eff00068cb6af3c2e4b30663099c5c6672dc6665c190c192dc2665c192b0cad9bc59d9d70b91bc59a6f0b956f0655bc199bc199ac199bc5926b1b91bc591bc591ac6d372646b1b5752649bc192ea2d6b199c6b0c371af279fa58571fc3dcf1e19f9dd7d6e678b9e1635290a0250233b2d9af1ca4a12928000f7f83dfaf7fa474f9bd1d6fc573d79efcd8002000cf0cecd9a7769b2cb16812c00016512c0001b2f671be3dddbf462f99c3bfaacf99d1f45c5ca79e59400005800013bdc2eef9fbf5a59c5f4fc74b3e87c03d52f9dd8cb474e1e5efcf39e3d5d4e6263bfcd3667dba1ebd7bf1efbe4ca7abcf82e6b1b94db9e84b9eb4b913294000000508511d8ebf1fafc9f76ed1eed5d1f817d53775ff3b1579494b00965a96096285b0102c0416acb376e35d289d2a5745966c1b0681b06c1a06e8681b11bb06961bb29a81b58682eaa26aa56f0f1fbb5e538dcbef7370e5c59b7573b9acb0000b2c654b35cb2509400007439fd1d7bfd1ba5cde8eb7e2d96396fc802165800cf0cecd9ab6eab045b2c0059480594b8d829132c7d4bd1eff8bbda7736fa1e4ebcbf2753c986b9fcfebf9fa5e3f95f3f7f859cc4280000000ee70fb9e7efd71c5f4fc6cca7d0783d5dcf275b9bec9b77f9b9bd1a36faedf0f2be83c1bb9f127737faf1f3bebe8631e7e77d1f9f0bc57d1676fcc5fa6d09f2dabe8f81eff3ea1e8e71658944a000508502591d8edf13e8799e9f568f5e8ec7e536e52fbbe4810102a58a965258a85a828802c14b0de49674b09d6d95b09b586eca6846ea1ba95a256c1b0681b0681b0681b0684baa1aa95b81af2f33b3cbcb970fc7d3e773f8171d012a80233b16618e58cb6592d940003a3cee96bdfe8bd1e6f4b5bf15cf0cb7e68094452019e1956dd5b755c82a058a20002811503a7cdebcbf41d8e4747cbdba3a668e2fae79fd3e7f375f368f679bbbe2f07ccfd57cb747c5a05d00000000ee70bb7e7efd9b8e5c5f4fc68fa0f0fd274f93d3e1fbf77cf7d1f0f09b7a1e1e863ad9e3f779f457a19e170f0f57c394dbe6e87897d7ab6f8f1beff27abc693e63eabe6ba5e6e50edf912ca040000a4a1284b23b1f4df33f55cee9e8d1eaf3f6bf2590f578128816012c54b2a4b8b44c9a93726f4b39662f56b9d344b33e54356b763df54dfa674965b6c1ba95b21aabb31e9a9b35dd9739bd6cb1b6a1ba86ea1aa86aa1ba95a4b1ba95a45ba94681b06a737a9cecb1c6e4f638fe3f3d91e58a00046765b35cb250950140074f99d4d5bfd0ba3cee8e13f16ca5df958500001963956dd5b755ca0a000000004017a5cbf54bf51d2e076f474f5e395e37d0cf0cf1f06b4f87a1cbed793c3f39d6e2f5bc305a00000003b5c5eb68eddacfc9e9e37a7e471cb0ef78badd9f95ed787d3dcc7c1e8e5f6cb678bcd94eae3cfcabaf97376e9dfbbc3a7cdb31d9f0e8d394ecf3f46bcddaf1f9b5c74f81ece3fb38f9874fcc595020000000525475fea3e5fe8bc1ae9e83b3f91a3d3e30205804b2d4b0c658dece963eff002fd5d376b4fa7c7abdb9e79f2e9e979978b8fab6fabc1e19d2d2d79fd9e7f761df4f97a3e69bf23db9e53c13de6bc33df8af85b756cceff779fafe5f673fc7dce7cd79bd19efb799e7f7f9f6e745f65baf03d38e574cf4e2d697af5cd686fb75e6658e5ab06c1ab0baa95a586ec569cfe873f2cf1f8dd9e378fccb1e58b284a019dc724d72c94258525001d3e6757574fd07a3cee8e13f181bf00a000033c33ad9ab769b98b140000000008864f4c7afe8f8fdb99eaeff0037a7573cb4edc7cbdfc9f3df41c2f572f99f374bc3bb7ac6400000001ecf1e78ebe83d1cbf5f33d3e0e6fd4797773e06cecddae765ef6bdf271ecb29c7bd7a739d0b8eb938f61671af62a7133ec5387976870f57d0acf9e7d15af9c7d153e71f444f9c7d18f9c7d1d3e6df483e6df4b0f9b7d253e6f7f691abafccf7e3e7f6eef27afbbf8ec86de0200b08585a962e39e1ba75ebefd7b39ff77c5a35f93d5e3e97a799edd7dbdfe7dda74fa7c7bf0f56ce7757bb5eaf472fd376ece7a71f4d9bc33db861d316dc174b667672bc5d5e6fabcde9ecf1ba9a3d3e9f07af46ae98ddf8d789bee7305aba71f562be6cf76d97469e86b97cda7dfe4cdcfd1bf47b2865b09a0ba595a06c1abcde973729c8e3f5f91e2f2879a144a0065942612e32d84b485000eaf2badaba7e83d0e7f470cfe30b37e62c5000019e1956dd3bb4dc8280b000001150ddebebe0f174776dd9e06cc71f4fcfe9e7cad99f9fa13c7af2e5bb460c7d539fd4c347afe4fc7f6dc4f37d4e1b3c33d9658000001e8e8f1b7e9e9dbf4f1bd9e2efd3cfc79793a7a9e692faa79d1e97987a5e695ea7951ea7947aaf915ea7947aaf911ea7961eabe457ade487b1e387b679167aef8e4bed78967b1e257a34e8f2eee7bfd5c0eb74be5f63dbe2f6f5bf2994b33e49609628085a97126cd7675eeeef07b7c3f6fc5e6ebcca73fd19e735b7565861db0dbafd0b9b2d7876d19ebcb672c9af25d9e6d9e7b3d58cc26b1f578fd15ab9bd0e76ee3e8e9f2fa3afb1e7c26bad355d3db09adb318b66c5c74e5e6af6fa3c5bf0de7979374b9f3fd5cfdb3c7859eda1760d5834b2b6b0d58ad39dd1e7659e3f1fafc8f1f983cb2ca0008ccb66b964a9529050250eb727adaba7e83d1e7f470cfe318e786fc92a80000cb1cab6e9ddaac8000000001b35ecc75f47dae2f779de8d1abdde4ec7e7f0d5edcbd3e5e567b7cbb386f68de4df9edd5e869f7e5aba6af3743cbcefb1f2fc2fa9f987a60f4f18b0504ca11620173d6977b425ded037b4537348dcd2374d436b50dad4374d436b50dad43635ab64c226c980cdac6c6033612b635933c629dfe077b2f076bdbe1f77bbf3794b33e2960228105a9618cca5d6de8f2366af5f66f29abd5eed7e1d79f2e94f0cb7a3bb91bb1ebd4c79d8e3d7d6f05cf1ee78a2fbb5f9b1b7df8f8ecd7a767832baf4f9586537faf9bb31e9e9d186bb7a997372c3afa33f0b2bd5bcebaf7eaf263ab63ddbb99b26fd3b79cb7a1e4d785d06cd0360d0340d54adac3579bd2e6e59e3f23afc9f1f9a53cb082aa2033b2d6b9718b094059401d7e475f574fd0ba1cfe8619fc630dbaf7e659540000658e55b756dd5645100000000b11d6eb7cb7b3c9ecfa8f67ce7bb5f4ee5f1fb3d1f374727bfe1f7fc7e5fa33dfb4f7f9b3f1fd1f46af3f3fc1f47d9e2e7f375f7cf9c7bfc7166cc012c1409490000000145000000000000265092c4594022aa2c0077387d7be3ef7bb9deef6fe6f70d9e74b04a58082d4b0929ac6652d8a2054b2845c923a6571b3a28dd4b3a0340d8360d0360d0ad8369634b0dd94d4a360d0360d0340d034b2b5397d0e5e59e6f2fa3cef0f9c3cf250b08033b2d9aa658ca59294009617b1c7ec6ae9fa0f43c3eec27e39a7d1e7df80500001963956dd5bb55cc9628058000000047a3ddc9babbfd2fb7e57dde5f4fd57abe67ddae767468f3e7cb7793c5ce9dfddccf2ebf579b3c25ddc04ca00001144b280258020002cb400000004a002c45810592ca050800583dbe2dae5f4fefe3f4bd7f9ce85d5b777820b12c5020b5010b6054b152c02d9284a745274a1d1659b06c1b06c1a06c56c1a09b0ba06c1a06c1a06c1a946906a8686175a397eae6b9783cd9ebe6f1a30000019d9535e39495165250040bd9e376b574fd0bdbe1f7613f1bd5e8f3efc0280000cb1cab76ad9aee6058a20000002c0588a16177fbb937576fa2f2f2b1d7bf479e37f04b32c160955282584b016250a10955000802ca0000500944b2800002580200000001d1ecfcc75f67cbeefaf93ebf67c5f6b5e79f9c112c50a815020b62c54b00b605256edc6ce943a51360d8362b70ad4b2b61360d85d0360d0340d14dc58d0360d4a8d2cc2dcbc4f0d98f336f3fcbca23c79a0000033b2a612cc75258144a11617b5c5edeadfe83ecf17b707e45e4f678f7e0140000658e55bb56dd56202000000000b2c160202800000096015088b2900b2abd98fd561ae1dfb3dd27c361f77e767f3dd1f67f219cd4995bb7a5ecfa3d7bf96bf6c67e23c9f7de2b9fcfb1edf1330292d4b0541528020024282802e7d2979fe8ec6db8e1cefe373cef779fcfbbc1d9dfc7f47a3e5f572e66cd9c3a17c16e7dd3c50f6bc2b7daf0c5f73c30f7cf0c5f7cf0caf7cf097dd3c26bdcf0adf7de7d9d3def01d3df79e6ba0e7d6fdee7a6fa33c06bdef02efa0e7a6ba0e79ae83c11ae85e79af7df026fdef01af7bc26bdd7c11ae839f5af7bc0baf75e79ae84f046bdd87875afb3cfe6f3e337f835797cf9616797362c250000066535e39630b2ca8a1291617b7c4ede9dfe81ecf1fb317e49e3f6f8b7e0140000658daddaf66bb24a200000002c0a22ca22894016148a48a24a24b290400005ec7d87cbfd869dfadbfc39726af168c9e9f86ed7cf65356fd1ebc77f61dae775f5eb7f8fdbc3cf9fafcde6e7d9e7f9af6f872a16caf4c79af4b3b392e86a3cb3abe64f186a1e84f3cf6f96b0a42aacca7b71bece8e1e8cb9633cf8673d534e11ecf36cdb67cfdf77119eaece2b2e5dc70e5c771c3576e714bda9c51da714bda714bd9bc52f65c6a762f152f6a718bd971cbd871e2f65c61d9718bd9718bd971d2f5dc75761c71d97192f65c62f65c6a761c72f61c72f6671c761c72f61c71d87222f5ef1cbd871e9d5d7ce1ead184c33518aca22800000233b15863642c4b412ca085ee70fbba7a7df7b3c7ecc73f93787dfe0df80ba08002965376bd9aec808b0000000596005828014094000492c20b12c00000fa8fabf8bfa5d5d3e8bc7af0bcf5e9f6fa13e13e73f49f82ce78fa1cff64e9f75d8f9aea6bbd8e6e5867cdcbefe94fcd7c7f5bf259096ebd3d5f3742e6dd9e4cf1b668f51a5eccd3e6347d0f931df2fa3a3debafc5d4d79679d7b1af1bc4d7d7e5b58f6391dbc2fb99f9f6f1e5fbb93d3c3a7ab9febe7e59f6fb793d6c75abe7be8fe7f3c79a561d2289288aa8b00010005000508a2288a228022c00005250025201400002880000a000000000233158639630592aa908283bbc2ef69e9f7becf1fb267f28e7fabcbbf20a00002ca6ed7b35d90096058000014010b280a000008588885800100001d1fa5e57d16be9a7cddbe4dcf4fa9c8eae2f3fc47dbfcf6ce5f1f7ebf9d8f4dbd5d1d7c75c6f4fabcf5d7f579b7ce7f3ff0df6ff11b71a72c7274ed7bf9defcb13c1d3f0653d1b67ad346df3db31c5b8e5ef99cb31f2faa5e86a659679dcbeff131d79fb5c5e8ebebda6af56ce3f31edf6f831dfa79de9de5f7cb73a381d6e2d6031e80896029251050000002800000000025859605850000041600a000b0142512800000b290000466b2b0c72c65a22c01946229dfe077f4f4fbbf6f8fd933f93787a3cedd90b40000594ddaf66bb2000800001410a58050000004118d940800100001f43f4ff05f53afa7d367cbf431e9797cf73978bc3b97b5e4be4b9bd6f93eee3d3b939db58f6f8b4f3729e1f96f678722c5d747a5c1e8a75f3e76ccf9faef875d6fcf9c97d7ece3fa64ca79f0ad1ede5fb71df6af3f2cb1b78feae74baf6ea61d3bbecf9fe9a752f8f667cf75d3859bbcdaf9cb878ecc3a2528008045825816500512800000000001160582ca00000115054a458a00a0000000002ca4544001b259584b254b22825001f41f3ff41a7a7dd7b3c9ec99fcab9bd7e46ec03400500b29bb5ecd76400116000141290a00a000025888105020004580003d3e62fd0fbfe43297eb39bc5c537fb396afa4f073364af7f8708fa3ddf2d8d77f95e45cc14033c07ab3f113d1af5ab6e38236ecf30f4ebd4abb35a5f4bce33c0801b358f6efe5d3aba7c0adda500000000008b102a14000000000000b2c0000000008a08b0142501400005800000a0088a00ce59584b31a04a0000fa2f9dfa1d3d3eebd7e4f5ccfe65c6ee70f7601a00280594db867859002058000510500028000108885014100080450944a00402ca65b75ecc7596bcb130c3299660a0000010000059459542000000165008016a2c0b028022c48b28000000000000000000000b0161420042850000000000050025801432971ac2598da4280001f45f3bf47a7a7dc7afcbea99fcdb85dee0eec03400500b299a6566042a5000005960140000012c484a000a80000100250000096532cf5652e78b1112c0a0000010000059554800000002a5094940280000012c44a20a0052000000289422c0000008a42dc6950a00000000a42900016002c152c5400658e5812592d8a2284140fa6f99fa6d3d3edbd5e5f54cfe73f3ff43f3dbb00d050002ca5cf5e4926785280010280a00000022204140000000020000000000020554289440000000802aca000000292b231678ac0801445115516000245825525128011600282cca24b0428000200b016500050001480b149502c0002c05942580194a4c6e204b2ca250815293e9fe63ea34f4fb6f479f7ccfe6bc5f6f8b7601a0a0002c160d9265662cb1259467865171f479e50a00000124b0428000000000b004658e6a9b318d62c0000000a8a004a2144a2288a250596000000141652c4515250000002a288112c000a00000002e58d8639424b280148b20a25000000005148a004a2148ca116000b12a92d0c5084968000201427d47cbfd569e9f69bfcfe899fc97cbecf1eec82aca25805012832c2a6c61989552e5626398c198c19c316431643199cac19c4c198c19ab0663066306c8617318331833460cd5866b196362eb66b3067131665c2e431644c664315a4992b1b511425105040141485804a54152ad4150541931193119311931264c464c46524ac988c980c988c988c9893262326232625cd80ce6232630cd88c988c988c988c988c988c988c988c988c98d2a0a90c98d329117768c973c64084ac4b931158c8cb180965942504b0a82a0581f55f2bf57a7a7d97a3cfe899fcdf85f53f2db7145d2c5580b2c425502585cb1b1920c98ab26233988c980cd88c98c4ca630cd80cd80cd80cd82b36033603360336033608cd80cd80c98cacd80cd80cd80cd80cd80ce624c98c336033614c98c336033630cd80cd8532b85972622a0c988c988c988c9064c464c464c464c69505623262b3290541521521924324150541505415058854150541505415054140b05415054150522d4150950544542d4150594082ca55ca5d72cb0000a27d67c9fd6e9e9f63bb4ee67e23e4bec3e3f6e28682802c80a4a12a1650014010002c11042942289650000000944b0a82a512841000005162924a20160b280004b05059400000014000191265220a00001289628110005000940000040000000a0428015289650588059909610a402a0b02c150541528960066c52a2d9000284fadf92fafd3d3ebf769dc9f1ff15f6ff11b79e4b2e8002cb0012c288a0016500802892c24b2965000004a0002149652288b014000810015442812c44a20160a00002c2a50000000059402a0a816000000082c02000a94000000012c0000002916c20b0a28000200594022880b14940001288000000000b0a227d7fc87d869e9f5dbb4edb9f94f85fbbf85db8ce597402ca4025854428500a4a859600540c6c20a5940000000004a00012c16500022c001480a9481004a202a5250594a94852000000005000000000028801042c0000a828094012d8c45000000a036ebd989af66158d9692808000582c0000582a0a0950a948a2288000000b0a227d97c6fd9e9e9f57b75ecb9f98f82fbaf86db8a2e8058000108a0a525b4c590c198c198c19cad73644c198c198c2e6306d1a99c31643166306635dcc60cc6b6c1adb060cc60d8355ce9adb06b9b46a6d1a9b46b6d569bb4696e1a5b89a66f86a6d1a9b46a6e1a9b46bcb3b2eac77cb34b70d4da35368d4da35b68d4da3536c35b68d4da3536ab55d835cdb135b60d6d90c26c1aee74d6d90c19d35b3a6b6c1adb060cc499975cd9135b60d6d835b60d6d835b60c2e55709b06b6c860d835b60d6ce9adb06b6c1adb06b6c1aee6306630668c198d6d835b3860ca4b8d04a20000005227da7c5fdae9e9f53b75ecb9f84f99cf0db98a58a2288a31b44513283262b33cb50dad436b50dad4364c066c21b1ac6c6a86e68a6f6886f681bda06f6856f681bef9d1e879e9b9a46e691b9a46e6986f681bda15bda11bda21e879d67a1e6a7a1e71e879e1e97987a679c7a1a06f79c7a1e71e879c7a5e61e99e71e868a6f6887a1e71e879c7a1e6a7a1e71e879a9e879e57a5e6a7a1e647a5e71e879d5e89e71e879c7a1e7a9bda06f6887a1a0bbda06f6826f682fa1e7b1b9a656f691b5a86d691b9a51b9a46e691be69a6d6a1ba6a86e69a6d6a1b6e91b9a46e9a86d6a1b5a86e69c8d8d50dcd436b50dad436b5437350d9304b9311511485415064c45fb6f88f56bdfead9f13a58bffda000c03010002000311000021112fb658618a282defff00f0ea4831bebaff00ff00559051043a8e7fdb61a8a4882835f3bfbdf7c6d469b7df5dd45f4d071041075a41471db197da7107df7f4e10c63bebbe0befbeb90f28d435d00167be28208219faff004c31f7a8efbefbefef49d145fdf8f6179bdd0a668a7c945823b2abf4d07df75f4d77d76d2410430d5841059ac576d041451f6d3430d7bbeebaab6b82dae0bab31de8a02faa0820824876fb38a5d7a9cc320b24b257988a7be392a7efbe08f6c30f737fb965a6c4cc6c210c30c30cb298f38e3900417e1370c05245b79c71c6d359ee7ed38dac8a08a082b2c4f5836f8a082089b05f9efbe291e7fcd3cf31ce7f3cff000d3cc612528ccb2893d7def9cbd87a39dc71ef3cb2dffe4154d841071f79c24335f6d061341c7efb081088239ca56853da20820bc5eda1678208a66b843fa1351a5943c420108a0c23001030021c407241ff008f0c30c3b2cbf16e34904d8418c30c1f7df4df710550047829a430c34d30c0020831f7e43fff006669440cc30259cee5002f8e28fa45e1c234b1090401c42053cf3ce0473cf16d0891c688efd0f5779fc30ef879c8004106d3c73fd77dff00db0905400091eafcf3cf3cac30c30dff00ff00f7ff00ff00a20821d993025ba3c1202e82fa7a78e01b43bcd2f620001cd17d3c07873cda833cfbebd61fb0fdff00ff00fefbe16d6b2d050c77ff00ff00ff00ff009ef0e30d1a0000043493cf3cb430c7ef38ff00ff00ff00d7800130737082780a6571a182c8cce0febd7f7d10c7a0053cc1793ce1cc32dae03e532f8babf8e7fe3dbefbeb8a18a2088477ff00dfff00dffe30c30cbb04800a00f30f3cf4df798c30ff00ff00cf38280f1bb9f0825bcd2ca3ea82185cf23e9eef345d79804f3c004f3ca340027bc5b0910f0e5e6ed3075ffbc7ea880add710d3fcf9ff7ff00fd7fcf0cb18a008f3c80001cf7df6f1c30d7dfcd0020472eecd0820940a2a7668618b7cd5f7951f69d6d03ef38b30f3881c7388cfa77ec5163ce7a946200203306b7a97d6f3be47afbedff00bfff00ff00fcfbbafaca00208010e7df7d7cf2c30dcd1c11c73a8510820801b396208258fee106b555f6d57da10b2c382090f3091046532a729ae60fa34e80a20af00234a19c30c127e00105bfff007ef7ff00f5bacb010cf2cf05461071ff00ff00eb2a483cf3cf389410824ce8a934211c80ba8116bf6df7df7920cd04e02082482fed0752ce1917b051128479c35934d04dfa20c20108000005befa30c30e3282080538400a5115da410c3cfea00010f22534d41092400b9536caa639ca852c377df7df698797000926a21fff00d39d4d75e261cce5da039f7febfa0000fe2a9f04709edcf68c00c72db49d30d04ac934bbdfff00ff00ff0028219eb8802043cb3255d082088ea5c6cb8f178bc1b65f7df7df7d661f1494b1aa7fff00c7b27ea9f1bdc7a922de2014c3f880000d28762efdcd624c4b1778ea8c1c934a4cc4c543c075f8173607911ac218200016f79082d20ebc70ecd3ee8bc5054f7df41f7da47d08867beffeff00c97ba99ed54e4870ab80d0d2f2ca20000cfa472dfe715d44aab3a36a6a4deb270f7c3c30b399fb5eb5d54feffc6c10021687908a808f46b0b0dfbfddd5014f3da5df75ee78b65735ff006f7bf5f826a3d1e17623b790bc70c20820040c8e32458ad4554839a2baca37762a021d3cf7c04111cb14b64c0fa86296a00032869082000e2e1031d7ff00d0c453ca3da55bec258cbcc431cfdf7bd4fe2293c0a071c44ccaba14e20801005fefdda29ad655661892aaec65e043b9318c07bd39f32e37a153152283f3984016b75592080e3c1132dbfec0c071873de430e346707e0831d33fb0ce29cabc262ac992cf0efdc2c30804105fa51c468ad6576b9ddc0f51057fdd22d5edfb778e38f78b599661f3cb7132000204109e8804fdc7feff00ff00caddf7cf3de630ee6c9a92883ec33c7fc27dca589bdf610d1cc0fe52430820847ce7bca68ad40e7a0b078871f74d9a5fd4eaa2a32c22627b69735bb19a75b282082410ba8804aa3438d7fe88f5f7cf2d000387517eeacbfbdbec30d167fc7302121c6c39fb0383673f597b6f2ffcb289dc095eac4bbaff008800889ae5bda4c456a833e941fe6b7bd53ff308009457860004d30031dffecffdf6cf39036763a865d5223fb52cfac3eed9554f717b5ed12ebe03864662e977b0d4d7c0dc1db55dc8a199d1406a3a238cc352e3f7b6e083d728199a13f1000ac4148e0115f3eab4ff00ff008ebdf7ca19a660c491db04383548d22ca70db2556478dfcf37ce3a0553f8290d627694564afc0f18ac9f9a756a301b4313e75a45d76853018355397a8e3180c4efa057bea411434aadff00ff00cbb1f7c1502735e405fc1dd29ae482e091bdff00ff00fc1071041071f7dc17acac34f554f05502fc5ead39b945d4331297e36ff97f9457b93881014343feb6a20205ee3f5db00551f4087fff00ff008cf5f75a0026d74e5c61fa45b17c000cb8214fff00fe9061041061d6f6c9ac013dd79ccbf540e87c9b145c0ed0981aca2bafbce8128108330931485fafc8ae00000ced168805d41e89eefb1e82c9c70110775ef3236c4a5d772442edc0098f3ffeb1cf041469069f540c208f3ceee3a395a9e1fe345c8a993450f3f7ae6908214033df71d5c12fb7834c000000b4253187545a99ff00f7fe8489740014f7dac79da3fd0435d8b6bfe89002ca34b1572c326d34881c0fb4ddd25ec8558b12a26dd6753f8d255978f9bc06d95b72c30d2a02c100351518400010415a99275bf28bfad7feca91f4013cf5d5d38c5038c716f07fbffc6d7a189e420b281aed163039d2de320e9cd10541e9c1fb0cb39f9f4b47c8322e3d2c6ac3807faf1bc2301ee430000c0fb1db81a4569b5d5bdbf7ca81d6033cf6b0e735c020701ca35e34f53567fefa681b1cf3567ef9a4406907f55e8035985bc040832fe3be8b2cb2c00d3cf188418def8a4b2fbef8000073803ef15da9161cc170107d454a81574430f410edf3880c10d2438ff0c59194193eefa3aeab54abe7362e0ca2436e940404572daa000b6b24200000030514d00351ff007f9e3aec9288203ca3c03fd140d14c9af9801b6c71408107d73ce450dcf04f386540c30ff7f941afb3650ada1ec583e2e6ca9150fd881b75e900030f7594330800420008028d34a00d65fcf2f6fba18e3be51ca33fff005005c1c611fb842ffcf00101075f7d0638c0114f156a62c30f7fff00f084bca3f96bd28d2fc635cc500ce39fa484f0072a53c9c0e1000008013c51400001d77f3f7ecb296f9ebbef3c007cc35020e30711ff008425bcc00d81175f7d1f31c801ca2261eb3ebcbcd38c3fefc99efca007090c32e9a030c30ffac3ff008d34c0c8f420012c13473cf3410cf3dd7baef1d2fbefbefbef3801fbe913e1c30415e37cefb81288052410412c470013c4e45be33efab0cb0c30fbfb79bc308f291cfcec8c30c33df2cb8c030c2385d3b0ce3c33cf3083577df7f1cb3bab96fbeebafbcd3cb5b3f7fb76593410ab43af2c7281f48411eb73cf2c7256beebef9efbfac77ff2c34e6c3843cf3c20df7a3cf0c7ee52073d3cf1d3c8e7450800d3c80b6dde75ff00f7ebfeefbeebe6a6d3cf1ca4b0ce141a51749a0735252c734d34129b60f3cc2087273eabefbefb6fecc7fbc77fe330010e10c3083eff0030f78d113b8c30c3030bd7bc114830c105c55b39df38c37fff00feeb2010f3cd3cee24ba901041f61e1b4bea96d2882968ccb3cf73de527ffdf7dd6104306b80015082165b4234d2b0a7d71d3edfe807be38c39f3c354033cf3dff00bf0c624000400000035f79c65e53b00e7c22e64a86154d36dfcbefeb1caa401c99263043cc214c3082000000002183d3c31cf3c775f7954d14d272ab2096fb218a38a48e359c679860820820825ae78e73cf7dc6104914d10c77dffeb8e4c5a4e77df71a51a3e514d804122b5e4177dd42720c2800000021430841dffd760c79fae48209688da43055e41c59ff00df9e892b297ff8412c304117df7df71141010a3a39a2bafa6bae38e2d5f6667df61c487244145005020f1a41771e74a00000400038a30d38008f79e0401577eb820861990c30d1f6955db6dfba086a41ff00f6610c314157df7df447b6420032fbeab2f9a882093f7df7df7dd43ec5e14300a143a20fb955f4d2bca00000000010000528000d3ce3c23df59f8a89aa4d0c30c37f90730c20a200ca4577ff004f0c935ff7df7df3cbd1a100920ae7befae38298bc71f7df7dd439d157c02ca007862a21b28a0df3fe7c4f3c30e32f3dc72eb092dbe020c3955efb216e25f2c77c3086092c205631dea872cb0f33741ffef3dfd630100c18530e30a00082cad3a147df7df63061a322ba1a20a676da4d35118a2bb1e30c1c6f2fb8f3dffe32db1e6ddc37c33bef8e6b1342c8a08a138fa201cb09045000054284030f3efbe6b25baca2096f79255041045462067ff7fcf2d4ffda000c03010002000311000010384008a38e34828d00f11e7036884dc5003402df2c880b4c2e0118408e23c3c8155cd1bf704908e1031cc3840c030110d08d30b0c71593ce08f00116420748c04b3c03c7009164142b4bf9a88800d38c24439f28b3c90dc4cb34b01d2450516ef18720b6611a824f0478812bdb9eef020f30008d1c200a2c2340a002a828f204dc62c034b2c02c312fa9600504c34b00d2c42436bf9453c014f3c228b2e6b8ef75b249cd3e0b25bf3b6649743cda24972812f2e73f735fb14a0623f09fee35fb9cf15da7c0415775b2b1a4bffca63470c106fa010c8d7265750c18c0803c1ac807f88034f38c19c0265d3ce896bcddddf7d2f047d362fa813b41ed42b00723d6d2c91be7a1b9976e13cf55e34e96a8e6a65db4e73aa6330afdd9b71352cac35dff005c6370459fd20434f3041e5a883cf368c8ec7919e5976163e4a218aa8e23d2e1bc30c31cc840eb5c410435c70f899435988e8b343cf3e0b2eceff30db808acb0fc832cf7ff00dc73ff00ee8813ecbab5e558bdb098a26a732bc030d35267e36aa841852401c42053cb38c0473cd94d7915e0c0a00f08986514a2c25ac8c14a792479c0289691fb8947cd3ce03dbc00000ca80138f202081a8b00820c2fd84d48b18610a3413c00f2fc92c52870019700801cc12d2c73d72822291e834c451e4f80100211c799528d380bf3883400013c92c020127a2cb10404600439b1282c10c7000277d782851b20b03c802ee9784c3c32710c027ea882c882d20530c7793ca4520c224880ab0a252e371c01c64000296b8d70286b8930214f1cf2041041c9a480082060c400f0cc2bc50d14000818da8f237a3a10a16b1ffb4d3c622f3713d924304d2c704820500c3001dd949160e535e0f0b7e16df5a030c9da5bd9020dd2c038600828f14f0c008b08808c0073cf25c18f3e100028250710e042365c9e08f226950c8500110148e90310808d10b68010a0e00083002c62306137b0c1d865aceb69b89be52d7c3390cc5b313cfd2cb3c53ce0c138e2a508b18c05110c1470c210d6021c11c73ac87a2c536cd33f42044bc9d893e41420c000548614eb4c26d3d460dc01a14c10f3a31ba99a18d1573b6bfdee30d194c81105d4a08138415a0430eb08c2cf44a10d0c4a0028618600030f3899573cc1d90dcc26080053a003ef3cf3ca04d61838318020b20e371eef90cd558683d4e5a10145e61b96ea6d0a52c60000019005cc1041d634c26404a3d11c114a0008c33ca9092c12e408da1224afd1291ec08e7ca204e9a73ca3c01471423811c620b6002faeb8ee995be825689bec8810a5c23043dd5f04aadff8113e44956c8034bea855a830a0f11430ff0022062190c718f3c40279d034f34d173f42d82ee344b0cf3ca2c000908a3c8d91207080022ef1f5739186ad11659b2938aa0034f1528fbd4730f628d1bc40c02f3508e2bd2f8b8b1408faf54c5223144218200c118d320429d527ba9b3090ab0c815f08d0030852a8206c882ca1000d2cc6822484b269e4e934312d31ee20ebb368af39a308560720827588f4bdedfd613c630ce1ad6350dbbc15bfec10072e7d14185b59b1e5c01c49f77c454f480181084b575f08ce101084220881c642d4ca6177fb98c8004228040ac660e381708ff220af7f6f951f22b9a2c28534401df89145fa4e2d7f9ca0010b4410005bd5e1e740144b3a0552ca7820491aa0bee6bbcc2020841723b72ce8cf65c90db0287621020100411cc117df030f9b7c3f4f462d30be9d354bac82b90dd78814447720e8bb3e4b2a15e510036453a84218206a0161876063e774e6c1db9c0e2cc04f1ef6d22f2298f8d06cfc7a61083046100a3360e341032f6eff00b6b7f5af5a1be5ddd858992c0ceb6cc1a6a6541f92722f1ca4121c802ac32e4f3471630893c040d1ec0f998b37eac11cd3801543eb033e15299ff800fb0ffcb7f2d883d48801050166e25b8dfed1d930c9e670a73c2a9c6995fd1c85881d181ba28224ac1038802494ebc53c02ec20024310a403f35b728974d62c53cf3b3e396d5fb596c0eefefba9dcc4959c1e75ac1402cc00595828e578386a2931001d47a4308d3a5cb22199d7ddab53090c9c57040816bd5f4e3090ef7c42ce04a73fe21f39764cd147d547288cc1d4e5ac77a8c5779bb9e6cc606e5467d0314adcb72c485c02fc6492a20322e1d94e368f893339476a91cb4f71083764940c0500a3578b10c07e1c42d56451c99c33b4f763de2c184c11d34da8ab8710b1c035adc5d83f315358780804c0fca4000bc6c2ea59035776f8bd158ea8a011ea880cc6a2dc3380c89009571ca08df987d218006638029e2dd1dfb953b5a293c3152bc037f2d000d34f0cf34f1cc0c571b27c35f3b10d87b8e8d1a70260d36dba1289dcc966872a15b4193aaab7f877927d030693955d31314513818028007cdc33453cd141e041a285c86300b0ec2e91e20852871cf2c0300223aba3c32c91ca3a87fafb25de1012b4ff00e496f5c4446f60cdcf341cb6ca31be5610a700043005961bd18c89f61b24e15364c0de2cb14abc53abd4334e6012cd46bb10b4428efb714428f1422863eb72b8d6ec50659098bb3452400ebd85441998ec3dee1ccc13740e72a28921ae010c1cccadf2834659668808207008738e29d08f3472bf02b800a99e0f2aec95a7ec00ae14222c319e08038205437959af9c87cac0df8eb3b98a8f89794f3a26e1641f0bbd8512e6cd8fd8504520e91a582344c6f2052c887138e3ce01c0c810e2aa9806f434004a166ec416bdbc90820f26fb7a39f3683e2e88d074c3e1efdffe939f7c8d6876112d4118b0f849d457d6cbf8d4c43033c332189952a048070e86b601702881dc0142ef2cde0a2082bcc931cb192e281b2333589cab8e976686d3e639fe3a8b5976d403233d840c0c82800848c80c3799088a20b4b10b3cf02318945f03e8556812023227cf00b3f828511b0dd0043b42c338b16cd0a00f2be1255acd4536b7f79eccaaa53b3be2fde0db6b8bc4c1b530d08520d8e72ec0d114d0542c115324c2cc14814f00869e00d9471c8ac1627fc411838d20828845c24630c3800479832832880738055f505fcacd0200655205fdd6679a03fcf5c70176c1e4f24234b1ad24b0cd34a15218f0c624238230d08a289721bc58c502c0cf7d5710890284e003430c326d7ee2833baf8d3c8201281b75c5645db0214631a33a9dba339c61ff0015250914b2ef2ce24c2e33ee00b0061cb2080643ce0d128424034b14056e040b7224f8cab5da0ac822af00134f3ce90674f20c2d0b4510424c10804b1cb4fe2853883732c50725c808d04b08b88926d30d65820610e08810728e31044138348364400030f3cf3807c51af3f900dbc5158301a4e00ec420000817a83cc00c0aa000a0015a08d3c3286743c483450763031893c01483020cd19c30d2435a440448c14720a2483411410cb2c00c604228f0ed3cb0ca2cf5c69a3108610e651082849f814f98890610c1fae010003cb01500b00800805838608508db3563420738437988422480d682506118009349303081085bc728050010c3c624dbcf1ca08e17842210218afd0ece10930a060485d380031e4f7280500010d34f4c84443890dd30f10618c2092b42cf0c83bb9880012e36064469c2350407632cc748db080c84106ca30090a30d3dea93f99c0600f34e4d10059f72080f6d98f4280d8fa05c90c3cd20202f0143cde2f9f7e6762f8f65799c059e61e06010422021c4c339ab24b3c7509ed9609293a2cfdc870811461250cceef2166982850c32cc2278690004c0104af114430d059320c314d3490476ced49c2470ce4d38a93f9ceeee1f20a9d75647cfb8bac71dc80c74cbdf38c355d8718c7bbefe33c76c5330a4dbce38c406a29538330825243e2cd6843297aa10504a0f724b28220d28214708419006830b5824440010482af805a8600121fde82c632f3473498a20008213c824301171118e1acb9f78fa4b2c30d214f3860cf206544f1b1446850450ea00938cb4a20d0051c238a30d38124247800c14c9890000c60e80082e42890dd6ee44a0a768f14b0e620018d2c0348445be118034039a707188000103bcf38d2c9025d6e41c196343b4500930f080e0a0053cf14010200d28f28908e2823d332e48bb5ebb00013c838500e31f1ce2cd4470858c00ad1ff2c000124594a302ac70003cf2c300948c38f2cf1cd02264110e0552079e6c72eb790e2cc200dc31182013ce8e1aa3ddef7020f27d8ddbc6b6170138f005c7ceee244cd00dad6e9ac109f8f92d3ce77e001960a8a0c0b792d7cffeea28410f28723fc36c4d97aaa38a679de402e1cf5dadbafb8312a3c414d2ec4208b6d302c3204da19c5b60918ef6bad18f92810739475014d682a4008f1a9f36f75f9ced359db62a6da014594881e4be38ee12ffda0008010200013f006ff004c698663946a89fc0176d2cca4c996a5fd9bfdaa583b0cf41bf50b9d3126d1c8236427d04b32e196d25b6568ad2d3ddbfdaa587b2df41bb1912cd22452489122929244891215a234967912242208982448912cf2cd2c1224489122448912d8cb048912244b14b3cb6ab9ad7ddc4f6a960ecb7d104c7211a4891242448912244891494949494949494949494949494949494949494141414142142141414141414141414141414141414141414141414949494922929282828282829428429282829282929292929292929258ed9dd44f6a961ec37d04c482248551549ec264c993264f0cf34f34c45cf5151515159513264c599311c544c993cd326a4c9932a2a264c993264f3cc993c13279e64c993279aa264c9e0568a84f0296deea27b54b0f65be82626a13cca27d5b732a12258930a62912cf2c722589760b8d07212c36deea27b54b0f65be8377614c0a3702edd734b1cc6eca7f412da4b632c33ccb86dbdd44f6a962ec33d04c2d1d9d44fab5d9c89674fe0f21be22e052dbdd45f62962ec37d04c2d1c2fd3cf04f1213cf3c09f5f2daa26f170296eee62fb14b1f65a26168efa68b1d21a6b2db7f243dc3f2c647c667c667c687c69c8f8d0f8d5381f1aa703e354e07c69c8f8d791f1aa703e3543e36e47c6dc8f8db91f1af2132d917c0b16553626fd459ad8c8a9a94424485279e5b45fa651bb8761b7f7317d8a593b2826090dde3f6c8b8e2ba9455e05e7794d57589638d6b9ab5ba8764ada1de121d923683e12b4f01724ed3c0f84ad3c0f84ed3e53e12b4f94f84ad3e53e12b57945c92b4f94f846d5e517246d5e53e11b4f954f84ed5e43e12b5794f84ed7e43e14b5f90f852d5e45205c51e0eb736488596d6e82a9af7160b4a46635d9d444dbafd3b770ecef510b7f7317d8a597720826068edb2263be6368e12916d2b123c264f5448888bf8a963b336131ad6a4a4852886ae447b432127cca8842bca1445922a16abca141df2205f50622ca6885a2f5850bc50817d4189aaa41d7bc26aca6841b4b2224d1514d452528528528528505246848e454542fafd945544d523246dcb16b64fb22635d9aecd702ec1bb9476754245e1dcc5f6a965dc82679931a3b3289f45947aa0a901d3b5d9ff009adfcc87d94f442f9be1b656aeb2165b3522a22aea552fcbc96243adaed4a932cb7e45871524e59545eb7cb9dae625e51112aa95075f911f0fe670dbc6237e6a953f11f7d44a50b82fc7a3e973b52976c7d2c3476c1c654aca32990abfb58be88266993265454545454544ca8a8993264c55264c9932a264c9edda3b0de1dcc5f6a965dc9e99d73b477d2e52f70a405ffba81fcd6fea413b3f8196cd7d2bbc86c7e910659defb27cd3dc5a2150fd5e62f06fca4554742497021a49bac7c9ed420d815d02722144583137ca464bdf35d30e7c04ce981c655f7ca642f7b17d106a2bb526b205d6e7f6b510ee56f8eb12e487c0ea485c0ea385e53a8a1794ea185e53a821794ea187e53a861f94ea087c05b8a1f94ea287e53a8e1f03a8e1f03a8a1f03a8e1f94ea26703a899c05b8e1f03a961f94ea66703a9a1f94ea787e516e66703a961f012e587c0ea46703a8d9c10ea467016e567016e767023dc9e52d1637425d698dbe23b3ae6bc3b98bed52cbb93120ed9cf3a63ca4ee1487feaa07f35bf9a10bb29e85eb7532d2dd6d21e46b1d15aaad9222978dda9d1e86b7b285a7271f15ed46b7c4bd7279ed6ca441b8233fe446168c9889099256eb2c570c68ae46358bea75068eced869be5acb664c3e6bc4c96b96242895bb522098dc65527eddc641c073a244978c8bbec08c4ddac6b11a5454a54238a8a94ad447a88f52b15c2c42b52b5348bc4d22f1348bc4d22f1348a6917895a95a95a95a95a95a9a45348a690a84788e452d56347b5754e65e160582b34ecae151bb87675cd7877313daa59b727a0985076c9ef90b186449f88dd8651f70e21ff00aa81fcd6fea421765be88478ed869372c875ff0005ab29a0ebe20ab67522962b5c28cbf2ca64580c7ef4451c90607eea7f61ad8568f045215921c3ecb5105441d6663b7b51464346ee49614cee3291b55a150c80bb686aba5be431b4a674cc98104cca2e65176c84b3c37f8296fb223daed44785a3739bc17028ddc3b3ae6bc7b989ed52cbb93d04c0820ed8b9c5b2d1416bbe299ebdc5df94c9a446aaef2cb68488d459cd1445c7947dc28cff005507f9adfd48435f913da86545f0ad739a8b290cb6448ee594d47dba34072254b22e2bf5edb46fd54ffc1172c5613b5917299b19268baf8163ca7562c492ee1f972adf19c8859735eb2e5be996d6fcabad37a664c6a5ed0ebb67e2648c046b3fb604144133a6751702e6912244b04b0a60edb0bf20d112a4fdec0a3770ec0a5e5dcc4f6965dc9e989a2ec6217c3a4d552f7bc95aae2cf6f75554cc8fbc9d19295e0263ca1ee14dd6a83fcd6fea43fdbfe94fc8caa63b48f32663406b22244ed7817dbd8af491628aac8ab2f2968b4abe22cd4b15a166f204672e9086c73aa2cc8e9b8c818eee93478484131b8b627fde99309286bf86041441057226fd47496798d2b6539ea196a6aac845cd122a3464547679667c4468c7a3b70e8889e222cc912259a58973415d4e432893b026060ec37a77313d0b36e4f4c483b1ae6717959b488a6535c2e9abda841b1beb948c8880ac77e1b0bf5b541542d105596880bffbadfd4842f998df6a1947736966e44de45b9e2427ea6aeff021dc71e32a3958ea50f87a2b622b919f2c88d72446bd5685fec58327a2cd568549966c9c88d73e6dd4edc59b26e236b9b564bb88193115aae556ea53252e27c0b42c55492484d83948cdaad9f8993cca617ae355924f81785bd55d245d48699cbaf5896c7b5a59ad6aae4d7e274e46b508778b5cbbcb6c7f19966b4a20ebc5a9e275937889783487111c932f3b5ab1ca586f09f891ad937166b522375a9d60931b6b6cb7896b68db63554e94d9ca63567857341dce328ff730b770ec37a77313d0b2ff008c4d1db051ce161d7e05b2e5d3276673226457cd3469775cfd11b3a464445c76a83a462a179ddb274fc5ab34f52ecca1d13119177b7c47e5159dda9545bd6c4ab392097ed91125a85bf2c9296a16f6b0f0412ffb1a6ad5fd8f882c9c85ca1b27143e23b26ed4332a2caddcb23e2db3f98f8b6cfe63e2eb3f98f8bacfe63e2e81c4f8c20713e3081c4f8c201172a61bdaa8cdea5d1fb68e8e5d73542ed8744344e58133da9d286ef4232cddf8965b0b1d0d14b6d9d1add459d24e4e45a23490856a5ab8116d15220b685469a573b58d88e5534ae6aa6f2ee8d342f86d4e52cd362a891a6e34ebb8573a53123ac8896b544de43b629658eae52cdd94c703738ca26c95b85bb8761bd3b989e859f726268b8d545b4a39d4a2966b1b95c8bbcb3dd73451977a703ab9bc08d77b7716dba526e56ead469b43a9fe031e8e49a13c36ebbd22a6a2df743927a948d75c7ab52385bae3795c75546e0e3aaa37954ea98fc14ea88fe553aa63791c25d11bcae3aa23791c753c6f229d4b1fcae12e58de571d4b1bcaa75246f2a9d491fcae3a8e3f95c36e38fe471d471fcae2c17146597caa5c175e85ecab7966ece04cf19b535c9c8b5c156b97d48578bdada48d1dcf690daee04772a780c4739db8735649a8562cb710612f01b096adc4786bab51763150bc5aaaf3a2ea5591a172441212a0e892494883055c84782b5523ecea9fd8bb602cd086d9226381b9c6527fb78146ee1f86f4ee5fe9fe481b93d0f15f5c2d171c7ecbbd0b4db1f0a2a2ff00e45c1794388cf995370cb4d2bab5a290e223c74692c88d6cd6e9f816bbc59426b2f8bc19f3a2f8ccc9cb4ba241f9bc37664c2e84d76f4453a233ca874487e543a243f2a1d121f910e890fc89fd8e8acf2a7f63a333ca874567950e8acf2a1d199e54fec74667953fb1d199e54fec74667953fb1d199e543a3b3ca874767953fb1a06f950480df2a090da9e0858fbc42cfd9c08267b5d81226b43aa567b88775ead625dbc88d76721b756b9c8eaee4757f219613a0eb1f61452059e823d8ea5990ecb24928ebb7e698eb022a0b76ebdc59ec48d225dc8ae98ebb51508163466c20ee71947fb99e628ddc3b0de9dcbff000fcc81e1e989a3b1b9b32f4b9ab5ada43b644b36a2c394ae456a394baafd851124ae9112dcc6fef4cbd6f36b6a5996dbf9ef4a5bacb3ddd68b63aa7cda858ac6db3b11adf0fabb3aca2216474d33a084b04f3212994a0b9a5b096d1bf2b17997fc5a9cd4e19e599a3b0de9dcbbd5bf9907fc6268ed8390b55dac8b3d522d573be12aab759d2e2c0e243ca57a24955548691edcff0016314b1dcb0e16ba6a51ac46eed5897326d531a2c9514bbe3d4d42799041312675d8cf326755c521ad9a969888c6fa178c6d2c472e141d86f5ee5deadfccb3a6268bb05ccad9969bae1c5fdd2164e426baa54990aced87a9a92d8293cd3c1513d94f34c9e6b05aa85a4b3c69e64cc9893328bb49e7f0c08533268c2f8bc6494b7c4559e14dc3b0debdcbbd5bfa90b30b8505dacf0a675234590911544570ddc2ac889196622a8c989b351627820c84e7090153c4b1db159dafee40b623bc66363354473789369f29369f29369369534d2310adbc457338936713e4e27c9c4f938936713e4e24987c84d84d854d2b6f12b695b789537895378936f13e5e26918845b6b5be25baf796a6eb522c457acd7120ec37b27ec5deadfccb3614105d9cc9e14c0e222eb20a08826e911964dcd0d354c693ce8c515aa50b9e9cef710218e75239ca88437cc7c57c35f95750cbcdede675c3f8097cc4e075cbf81d751381d731381d731381d7310eb9883af788a25ef10eb88875c453ae229d6f14eb78a75b453ada29d6f14eb68a25ef14eb78a75ac53ad629d6d1791d6b10eb58a75bc5e475bc512f78bc875e9114896a7bf7b855c4a26e1d86f6ee57d5bf9a167c12cc82edd044c2e1edd643490d76bcd1d268234f0213906e686d35350a91486cde3a0a909a3d350d8331f0e937b882857372cc5d6d52cee2d09f2932a27f4d3db289b8761bdfbafea6fe659c77f84c29f40826151ee1aa923c4aa4c2a9a1549489ad3510d358be02907c08dfba3506788d25ac88ef019b88fb8f1213e43db4ba7e03e2cd249bcb342a53591dda91314ff8126e1d86f7eebfadbf9967dc7fc26d971a2625422c218921b0c8a4042233e61a319cb3b146bc9c8d20c749457eb1cb370d7915fa8541af90d7892e039c3dd3c49fc09370eccb9ef6eed3ded201ff0009b75c0826c150d188d1586e3788c25811c544c995132a279d1646914aa7b44da2fd0b770b9d735ebddb7ded20e74fa141368f1a370a605fe229b85c37af76df7b483b8f2e64c09b441136ae688d130a7d227f015cd3279ef5ec37ded206e3cb89aa2e755d827d3cc9ec279e64f6aaa22fd04f60ec57b761bef690376c133bc62e096d1ca22edd71cbe8544fa45ceaa2ae2bdbb0df72167dc71c68a4f348a49122448912244891224525248a456890c9124294244b36a35124cda8d46a351a8d46a351a8d44d09a1342684d0993264ca8a8a8a8993264c993264c9932a264c993264c993264c98ed6213264c993171de9d967b9081b86898e65454545656545454545656565656565656565656545454545456565456545454545454544caca8a8a8a8a8a899326544c993264f3cc993264ca8a899326544c993264c993279a64c993279d735586f5ecb3de840dc37f771ae65c49f40bb4513613c298678264f69327827b1961bd3743f710370deca6c570a7f01961912c09f43327b75c6a5e8bddfb883b8676536c9f553cf3fa89e378dcebf46a5ebfedfb883b8676763229292929292829292929282852852829292828282828528528534668cd19a3344a68cd129a2534668d4d1a9a334668ca0d19a2344688d173345ccd19a32834668cd1a1a3428434650505085086890a10a0d19a34346868d0d1a1a328282834668d0d194141a33465050502b4a71a97a7fb7ee20ee3c334c993264c9951515951515f2349c8d2f234bc8d272349c8d27234bc8d2f234bc8d2f234bc8d2f234bc8d2f234bc8d2f234bc8d2f234bc8d2f234bc8d2f2349c8d272349cbee69791a5e5f734bcbee69797dcd272fb95f2349c8d2f2fb95f2fb95f2fb9a4e469391a4e5f7349cbee69397dcd272fb9a4e5f7349c8d2f2fb9a5e5f734bcbee69397dcd272fb9a4e5f7349cbee69397dcd22f0349cbee69397dcd272fb9a4e5f7349cbee69397dcd272348bc3ee69397dcad787dcaf97dcaf97dcaf97dcd272fb9a4e456bc0d2159a434857ffe9959595150b8edf6757a23a68890e6a59a335ed4549eb49eb4ff00ecffda0008010310013f00db4f3266993c53c2b8973ae19088393ea57669b69122cdde43f7216ced2fafd02624ce9b05daa385598bfc1136b3114b3f790fdc85b3b4bb255c13cc98e64c993264c993279a64c993cd3264f04f14f34c993264c993264c9e6993264f14c9ed264c993d9d97bc87ee2d7da5d84c55264f0a293264c993264ca89932a2a2a2a2a264c99515151515151595151515151515959515959515151515151515151515151515151515151515151515159595959515151515132a264c988a4c9e3b277b0fdc5abb6ef5c6aa4c912c1225b59679122439a489669122448912244b34854244854cf22929292924489122448912c321533c89122448912d84b3a2898ac3dec3f5ff000a5afb6ef55c6e5113ea133aa6d57e9a7f4e8261b0f7d0fd7fc296aed3bd712e04da4b02ec9505d84c9e7912fe152c760efe17aafe4a5afb6ef55c4a2674d9a6041764a28bb1993264ff0085b84c377f7f0bd57f4a96bedbbd71386fd44b34b34b32a12244896691229244897d626c5360a261b077d0bdcbfa54b4f69deaa26170dd92ed21c157967bbd1778975b0eaa61d54c3aa9875530eaa61d54ce275530eaa61d52c3aa58754b0ea86713aa18754b0ea961d50ce22dd2c23dd889b88d6756679899e64fe893629b05130ddfdfc2f77ff152d5da77a8985c3364bb386ca95108506944123319bd4e9d0fcc74f87c4e9b0bcc74d87e616d90fcc74c87e63a6c2f31d3217985b6c2f31d3a1798e9d0bcc74e85e743a6c2f39d361798e9b0bcc74d85e743a642f3a1d32179d0891d8eecba645835f81688542cb3a0ab8131a6c65f44a2676a0a85dfdfc2f72fe952d7da5f5130a8dfa5bb2154ef423369639dc1089155caa22a9ad08305d137112ccf66f20d91efd7e044b13dbb885607b88b607b4e84f224273457295295295295a95a95a95a90632b5c841654d45e25ed06992ec930a6c13e8d44cf326583be87ee5fc94b57697d44c2e1bf44b9ee5ed38b627ec9fed5177977ddeb175a91ae84a7848bbe02375116ca8f4d6840b3a4a436ce86835ee3448259d0b6d9a7e05a61d2e5c0b819bd0b2f76df42fb4d4dcd32a27ccab993264f3cc9ec11091224489122448a4a4a4a492ec5778986c1df43f55fc94b4f697d44cc99dc27d2dc9da716cee627b546ef2e895246dca592249ee42a9cc8237b4a4f59b94d2fcf22336685e166dea9b066f42c9ddb7d10bf3734b4dad90515cf72248bc72d1ac9a43d7cc8f9691977391a2e5a47ff00d43e348fff00a8265a47f38996b1fce7c6b1fcc372da3798f8da2f984cb48abe2372c9ebfbc332b5ebfbe332a1fe63e267f986e52bd7f786e50bf8897f3fcc36fc7711b7db86df2e5f11b7abb88dbcd788dbc944b7a896d1b6b12d224612288ee422f2281d0873258dc26042c3deb3d57f2523ef51bbbf0c2e136cb9a786e4ed38b5afeca27b54552efb7ac22d17acdbbcb0daa4f59f89d351a8ab32cb6b47788b6a6b75aa8cb523f5a2968b53589355215b915f35512d68e42f1b424a42e366f42c9ddb3d0caebc5964855bbc37217ee51bed0e5557493c127a8b45e6aabbc75a9cef134aee2691dc4488bc4488bc54d2bb8a891578a9a4779946c577151233b8a90a3bb890e2bfcc322b97c5486f5e2437a8c7a8c70c728c70d518a3068c1830620c60c60c60d853160c87c298f653897789810bbfbd67e3f9291f7a89e1e985c3304f13582b472c847ec2e4edb8b5f7513daa29060ba22c910ead7c86589f3dca85a58f67a10a33dbb954aa244dea699f0fc48919cfdeb335891dc9e2a3deaedfb066f42ceea61b5791ff00546f855564345d532d96a572ef262099904ccd10410869ad082432190d0620d184341883460c41a3460c183460c1a3e14cb442c4bbc4c08587bd67e3f911b7a8ddc985c345d8350850e641b0d522d373d4c9b535a16982b0dca9b95063e78ee5edbbd0b5f74ff6afe44b59775951ac4596b52232912123da5b2c68e44f53aa9abc86d829d4a44bb516531b743547dd4d4d45b6cab05762cde85ae3e8acf3ff00c4ff00a836e57c7449f828f59a88208208208820999a42de4352110c8683060c183068c1a3060c1883068c1830442d4d9291124b8546e1b17789e8bf911b7a8cdc9e8985c370261696065459ac8bf910588bf2fa994d63467ce842ed63b9bb6be85abba7fb54627cc9ea5915296fa16b6b95dc8b3f648ada913d45649108cddc444ec8e96a23226a2fa625331760dde5faf9595bed32de24e3a7a2e74cc820d421c173d64d6ab978097547dfa351b608b55342a2916e788c6cf7942a6f21a48b1d91cfd721d66560c68c4183481055de02425690e12f01a92183068c1830863068c1834b5b7711f7e151b86c1de27b5dfa548bbd466e4f44fcb0b84c0985aa58a3e8d4bbedec88ca669318f93a7c94ca98e8e87242137c71dd2e93d7d08ee9c289ed3729775b115a8d55d682c4a875a5ad494c6da1151359a6d5bc8f694d5af7116d48b2d7b87db2aa75ee225b1165acbd6d08f6a24f3ae6912cec4d6651ba5654e4d32c22571fd33a6641084ca951137b9751715c8d631aaad9aaef3a231356a412ed86f74e4932d9772231756e43a8562bd565e244c9f56a4e45d764f9652dc5aac2ae21dccf5f01b73bceac721a256ac94bb2c88e6a16ab153e042b37ca3a0eb90db3a8d8521ac11921a921a3060d1830616b4dc5a3b4b85778986eeef53daffd2a45de43ecb7d130b84c4b9f76f5911edec66a476b2cf95090e7f34a5cc6e59b25db225facb53e9570c9393e559e3b2c5a1d31b1aa4e4a45bbeb5f97510eec88ddca7468dba67408bc44b0c54f13a2c6e3f716c1178fdce811788977c5e3f73aba2711d74bdde275338ea671d4cee4752b8ea55e27522f13a91c752af11b7650b35d7232ba2536672f042fd8ba48af7715cc9993334ba99547869ff91646d30d25e085baf488c8d2d7bcbaed6e7bd273d65a75b7f02c1659bb5ee22d81aade259ec68d5519654570909add42c36a21a26aa296e848d7174ac9a85a64e44345260d85e2365b8d1eb21c1d62c2d644490c5183068d1830b578169ed2e15de26042ecef93daff00d2a47de43ecb7d130b84c4a224cb42e81b52a4cbdb2826d7222c953716aca17e91bf32ebd45bef988da951575966ca08f34aa72e33205eb124ae4559c8b8f2a22351a8f59c975fa161b536d488e678a0e6cb52922582cd6a96a5204645f111e92de569c4d22712b4e2691bc45889c4d2271348de28569c5047b7cc8691bc4d2378a1a46f1434adf321a56f1434adf321a56f99058adf327f723da1a9e265edbbfed5e8d5ed6a2f4debea20820999a5822e8e2c3770721765a922436ebf023dd0c7beb52cb666437cf81122b553796446af8915cd6b378c7a22aacc64549ef23da1269ac7464a7790622222eb2f07a4cbbde88cde25a35ca66952811e8a319ae731f13590de9298c888a4474c863068d1830696b5dc5a3b4b8242ef133cb35d9df27b5ffa548fbc87d96fb530b84c76749bdbea5b2ee48d09cde2d3293266d10a24da8aad98fbbd1515cf6d2e696cb1d2bc7c4877522b51fb8877676294de9acbbae0888f7707193b743e1a4397817cd9921bd25e298db15cddca74a7f13a4bf8a9d29fe653a4bfcca7497f153a53fcca74977994e92ee2a74977153a43b8a9d21dc54e90ff00329d21de653a43b8a9d21dc54e90ee2a74877153a43b88b15cbe265b7fa6fc4bd535882664ccd1aa5d57eac04a5cba93728dca6872ed11729be6d4a7c44929d458b2893cc3b285152550cbea6abac4be398ebce721b794d37906f05f1522da6b2cd6b93647489acc6db2692990ed1ac6da0d24d46c418e1a3068d1a3068d2d7e047ed615de261bafbe4f63ff004a968ed290fb2df4130384c6d74b59765e8c72231fbf74cb55d30e3b5569474cbeb231ae6ba96ca65f59316880f456b5551a40bae2456b52956fe05cf93cbf222b7ec5df92ed6ad4e41d16058db2d4ae42d96a58ef572fd228b9a79a59b2be157665e45ef0b5ae64104ce8a2293cc8437aa78aa10e3bb9909fcc86e18a435183086a3146290c60c1835460c1a34620c1a354b5388dbd70a899a59eecef7fa1ff00a548fbd483d86fa61709b0459163be6242d4ab52106f183694445d4a5a2e6851b5c916643c9787576513f022428162869b95c85aefa7bb537e541f15cedeb3fa65c57ad9b4f05ede45fb615639ed54dcaa45652aa99904104133a0820c4ddc8848ba88630864341a3060c4183060c183060c183460c2a9211e2ef1cb3c499933ddddeff43ff491f790bb282605133ae36bd5bb8b25f0f85a97e642365039524d4911ed4f8bda59e75c72170524b672cee6cccadc9f5755158d9cf7c8bc6ed5455596b1f095abad30a674ccd212ebd642521f810d460c18310610c60d1830620c41a3060d18a5688448d323449e34c377f79fd2efc88dbc81d86fa615130a6d5704387aa6a3a2220eb420d8d52c844994a310747441f6a418fab672252d6a3ed489b8891922249c88a8a5f992ad8937c14f5696eb895aaa8ad92fa112e654dc2dd2e12e970974b84ba5c25d0e12e870974384ba1c25ccee0a36e67cf7290aeb7795506dd8ee632ef7701b6077021d85dcc6d89c32c6ee036caa32cca320a8d82a321386c370d62a780d45e0351464c6aa8d70911457f322451571a13c160ef3fa5df911b7907b298544c298933c896655c082f64889351f67214292cc82d9b90b4890ea590fb3c882ca5336e162a091114d3266511d3cd21a9e3c0b4c69a8c85349890e63d8ad1f76c1b576d88ae23647c176e5a4f82e1798f82e17984c8c85c4f83a1711323e08dc9182372520a1f0bc1e0264d4241b93b0904b82121d4708ea584753c31b7543412ec86757b0e80c3a1b3809656703a33380d82d4121b446b781ab81521a4434c69c58f315f3d8a0982efedbb9317fc11975903b298544c33c32c4b85a3bb23dab31f5210e36b9167de5a26358e9915ca8418b527a668ee9088af2956911fb865a3c08ef21be4b316d1252145a87ac9a3f5a911926248848a8e42d8c9165d4e244897d0cfe8105cc828986efed3ff96bf9a11b790b527e2ec2a27d02e14274a0c7cddacb54bc084c9be635c88a457ea2cf11ab3abf02d2a8a59b7a885a5359037387b85d62ea1cf9a20d66a9f11edd659ddac549b64446c946c4ada89e242874acd5751698f5bb51666ef5ccbf469b74173aef130dddda89fcb5fd4846de42ddf8ae75c72d9ae2459134720f86a839154642920e62cd05873441d0dc83daa426539a2b2a1d094d1a9a11f04d16e28f9507c055520415451148b0a7ac74356ee151ca32028c65299d33aedd3e8fc46e1bb7b513f96bfa9a45de40ddf8aed930aec5ae91a51ce1af91a94472a0b1788e59e0a73a94884b02b517c0486de04897d5a6d7c44c3772c9d13f96bfa9089bc81bbf15fe00c147615c0826d9769225865b44c1e2261bbbb513f96bfa908bbc81b97d712e296d571b5c2b855c2b81364b85732ff004c560deff0062fe6844de40ddf8e2709f44bb05d8c84c4882a6c176284b609b798d4c560deff6ff00c113790b1ae768ec33d9b5054dba624c6b99714b3a0b9a78e64f62981104c561deff006913790bb29b054cd32a264c993264f34c993264ca8a89950af27b2d79f59acd79f5e6912359ac912259a44854244891224489122448912244891224489122448912133cb348912c761fdff691081fbdcb6322452525248a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a491229292452525252489122448912cf2244891224489122448912cd224489669122448912259e448963a70d83fdce4d226f206f70bb65fa35fa14fa6425b05d9d586c1ba27b7fc9137907b4efc05cebf572d9cbe817e9d05fa0b0ee89ed41fbd485da7674d9afd2ae24cd2dbaec69c6d1df4f62dd13d107ef21f6973a61993264c9932a2a26544c995151515151515151515151595959595951595959a4348690d2159595959595959595a9a4348a690acacd21a42b2b52b2b2b52b52b348a56a5454545656a56a56545454545454565654545454545422e342c7d989e883f78d6c97612244b3c8a0a0a0d19a334668cd19a33465068f99a334668cd19a3282828282829292834668cd1f329292928e651cca4a4a4a4a4a4a0a4a4a3994141414147328e651cca399414941414141414949494949494949494949494949494949492cd3cf3cd32c915126d94d624913827a919b4aacfec7ffda0008010101013f02fbc5a7d66f130e27de353ebb789871a27c38bf12cfb14facde2501bf78d4faede261c6fde352ebb789406fb9a3ee828f5dbc4a1f5104f7046ea08208d1041046fa08ddc11dea08208208208d104104698208d304698208d10411a23da8f623db8234c104688d30411ecc1047b11dd68f5dbc4a1f5104fbc5a3d76f1287d44f73493dc2744924924eee49249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249249277124f79a1d76943ea27de350ed1bc4a1f513eeedbf6eef0fda378943ea26f53eeb939b7787ed1a50fa89f78d86ed1a50fa89dd57bf27dc3aef30dda34a1f5137882ee17bbafc669de905de617b56943ea26f10777f5f8cd3bd345de617b56947ea26f1077dd6345177785ed5a51fa89bc41df758d145dde13b56947ea209bb41deeeb44a2a6cea6cea6cea6cea6cea6cea6cea6a14d429a853675350a6a14d429a85350a6a14d429a8536753675350a6a14d9d4d9d4d429a85350a6a14d429a85350a6a14d429a85350a6a545647c2ed177983ed5a50fae84dc26941deed65219486b0461679161621616961ab42c42c42c4356858588588586ad0b10b10b10d5a1ab42c42c435685886ad0d5a1ab435686ad0d5a1ab435686ad05a6839883e88fa239b1f0aa0bbcc1f6ad28fd44137683bdd94a98d68d68882293e5fa13ebc49f324fd89f5c54fdc453f63f7fd49f33d7e827d347ee7afd0fdb47efa3f6d0bbe5150a94a47363e14417711ec60bb66943ea209bb41ddf105df31246346b79c73adcbcc5c51b61b61b61b61b69b69b61b69b69b69b69b69b61b71b69b69b69b71b71b71b71b71b69b71b71b71b71b71b71b71b71b71b71b79b71b71b60956ed106229fc28d17709d1ec60bb66143426ed077baf0ec1a8392d49fee857ab76f23d88d31dd18f8293ae10aac91e90bf09b45dc4fb182ed9850d09bb41deebc32730d4315d45e2df66342248cc3c8b862a528194ee1b87170e54c38ca32370e2e18761c6d11681528da5bdcf09a15a56eb7c26d177981ed9850d0ddda0ef75e1ba04317d9afe5f629d39130e54a3052614da592855a1e652a7035a5a2d3916940d696798b4e7f53562531d4ca94e14a8c8ee5831052bf5be1368bbcc0f6cc28686eed077baf09d0218cecd7f2e9a6c928511b4cab43ccb2d528a48883d3cfe4350a6d2af37ea30a8df22934a9cdfa8cfa8e41a29599cfe26253cbb960c414afd6f84d05de603b66943437a3709a5077baf09d0218becddf94fea21410a4835a544f3f9155bfe2507979f667f21a30aabcfe2a521c9e42730e5e7f1518a565f218e3a47a7995a9dc39b1dc707a14afd6d28d91b4544c39b321b321b29b31b31b321b29b29b321b29b29b29b29b29b29b29b29b29b29b29b31b31b31b31b31b29b29b31b29b29b29b29b29b29b31b29b29b31b29b29b29b29b29b29b29b29b29b31b31b29b29b29b31b31b29b31b29b31b31b30b871688acdfa0bbcc076cc28686f46e274a0ef75e0fa04317d9bbf29fd4428b8a2e1af2a3bcfe457a91ff001fd0c3a8827408532b37e6a5351eef229f3955b0be2a34acef229b860f6c8e67af0310cee3831052bf5844929d09194604a62532c2c2c2c2c2c2c2c2c2c2c2c2c2c2d2d2d2d2d2d2d2d2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c3566acd596161ab2c2c2c2c2c2c2c2c2c2c2c1582b07531f4473637a82ef393fb6694041bd1bb41deebc2740862bb377e53fae863e0a35c6d52a620ab5254c33b984708ee6f5fd06bbe431c3dd3fa8de652a54f229bc7acfea747afec57a9cf9149c23a0478abebc0c4bb9b2ee3831052aa4b8a3406d3118230b0b4b482d2d2082082d2d2d2d2d2d2d2d2d2d2d2d2082d20b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4820820820820b482d2082d2082082d2d15839839854a43991bc68bbce4fed9a50d0de8dda0eeef0411dcb09d0218aecddf945e95e3a58f812b8fab3a2854812a0fc44214ab0da86b07e2204af235e2d42ae245a9232b40dab223c7d682ad4bbb8e0f42894f9c6b06b44691eff815a39839a55a6392376d1779c9fdb34a1a1bd1bb41ddd5ad91b40d98d40b407d38ee384e810c5766ee082f4af1f6d0bd5073a44512b2a1b428af5511d0257516ba8ae9d28f835ca2be7b96134224960d6889f01aa0f60f69559bb68bbce4eed9a50d0ddda0bdd18cb8a340651355cc3a91ab2ad292a538ee183e810c5766ee082f4af1d34e8c8dc30b851f86819447501edb74b1b22531f4bbd60c41ad239c6a7bebf6ddb90a8d2a347a46e9a2ef393bb6428686eed05ee68861a914a90da6583d839a39a55a454a76eff07d0218aecdfc10774af1d1469dc329c08d2df99abbbf41d4a046498ba3cebe1f2130c2e194632046167378a1b39b29b2a9b30b861ccb7ba60c620882209efafdb795107a159374d1779c9ddb21434377682f73a2d930ec2934468a3fea3dbd3e240e695e9f98e48df60fa04315d93f820ee95d18560882379bc147d429bf9f21dcf90d4e93129cebe1f218c93542d011a23798461ab1b4c7d22c2bd091edb7b9e0ca682089efbfdb7683d0a88564dd345de726f6c850fb34377682f73a0850694f42a8ff00a8bf5f90a9ebc0542aa74fe62b75b7d83e810c4f66efc283ba578886193986a15961be0a256929a88a34aedfe2c8a4d1c5b2998ade729b79b2239c6b39b3d08d91cd81c9cde0a631b0e5e3dcf06534104f81d4aa856dd345de726f6a850fb34377682f7242814146b8bc9179ff0051df523cbe438abf6fe6311d75df613a04313d9bff000a0ee95e221867730d51e9737c14d45a31a5a30add6c8a4839044e6cc7f48ce8c89e711dcd9970d5e61ce3a514e51eb2f1f2ee78229e84ee08926a94d50ac811a58399eca08d159bb468add105a2a7715faeeab15f7482ef3937b54287d9a137682f72428a945c2292354fdc7fdbebec17d643caee8ff97c8aab2bbec27408a623b37fe11dd2bc74616a0d70c78e49fd3e431be4547949e555e7c8a2f2a3bcc6bb997c47bb9f229bf9b215dce23bf8732e1afe6f115c35fcc63d65cbc7cbb9e0ca6a2289bf63246d2118583a98948d58f68e4208206888385420820823d862488c1cc1cd29b4b472698df2fd77558afba68bbce4ced4a1f6684dda0bdce938a2f18a22161fb8efafc872791517e4bf331753e6bbfc2af308a55e7a6efc23d39d74537da52ad223cd60b5a05ad70dab06b6e19505a82d716a095e0d61af811e6be04a923ab415df7af73c294d445137dd2526089a24551a4155056894cd50ea6220c41c85a2533546a8d49ab1698e6e8a231a3983d831a2a0f42c1298ac158585858582b4460ad1537f58adba68bbce4ced4a1f668febc7769dd114c3bca4a30b456f98e68f4f2314fb7fe5f32b3ee5dfd07c0d52e948fec6268c2c91a1af541310a82e2547555511ea2d4512aaa1b429b428b5554d6297a9ac52e5358a5ca23d457aafb10410410468820820820820a74a4625a525244df534e729a68ab5204ac5e53768a9a1a8583985a3507208c1ad15a23056968e68f68a8501828f41ad1c2a488c2d2d15a582b46b05696968e41e9bfac57dd345de725f6a50fb347dabc57769dce0a7464a542d2914f42bbcc5592a2f97ccc552bff52a619456c6f9ab053708a2ff0017ea2e18d94d910d90d910d90d90d90d90d90d910d90d910d910d910d90d90d90d910d910d8d0d8d0d910d910d8d0d910d8d0d910d910d910d950d910d910d910d910d950d950d990d5c68a4346efa8f48c14ac20853d0f2d189020f415a221035345c48a4e8a883ca035491c3107a1040aa35645d0a835a4168a83ca8becaeeab15f74d1779c97da943ecf0d0bd2ee2bbb4ee4ca4ae2961e04a5023462c0d5f2f997f9fcc57170ae9f5fdc77dbf98b24ab85952bd0b37d4df035e35c23c43d647ee7ec27d0fdf427d3f53f63f73f7d1fb7ccf5fa9fb9ebf427cb47ee7afd0fdb4ce8fdbd9927d955154738a6f18377d4fa4a6ba2b531b44b20a6dd0e20441a83851051052468e2442a0f28e8b89183f4b8620e244e7109d0f2a28edfd62b6e9a2ef392bb5f0287d9e1a1dd677e25f9eed0fb3b850a170ca10234774780cfa8e5ff112afaf11aff315c5fe423bd788f59fd747db91568a3cab831cdb77ada9036b0d78950d621ad435886b10d621ad435a86b50d6a1ad435a86b50d6a1ad435a86b50d6a1ae435c86b90d721ae435c86b90d721af435e86bd0d7a1af435e86bd0d7a1af435c2d641f5c7d5930ca304df273149c22e88146ac0ae15c48d52473892e2e114571222c0e768470f51e512e1ca238a6e1ef2e274b945714dc2b8b8478e715145dfd62b6e9a2ef392fb5f0287d9e1a1fd677e25f9eed3b85349530ed194e45647e9f31dd1e0bf31a3dbe47afd492e24624fafee274951a234b39bc3cc733ccc7d0fb77e9514d6a9ad535aa6b54d6a9ad535aa6b54d6a9ad535aa6b54d6a9ac5358a6b14d629ac5358a6b14d629ac52f52f52f52f52f52f52f52f52f52f52f52e52f52f52e5274614609bfa6f81b5047178e79ac2f2f11e23cd60e7979797979717178ae2f2f15c394a6e82f1ce2e195073c578d788f2f1cf15c31e2bc578954578e5ee158adba68bbce4aed178143ecf0d153aeff00c4bf3dda770a7d2517146a747117f8b24f98acf329a73fafe85567f88e6737afea4f4f8e869413cfe63a9ff1788adf988ce6c89f3f9955627c4c63a73ff117ded85182770478954d68af2e3585c2384a86b05a85c5c5c5c5c49717125c2ae84511e2bb4238bc551144a85e2bb4229792238bbb8d62b6e9051777c93da2f0287d343d65ce5ffc97769dc10a35465629d5f21af9fd446f38e4e8fca3dbfc3ebff90f674f8888214105e9cc797f90fabebc4ab5ba7f3188ad3ef7c30c1bde67ddcaa5552b6e9a2ef3927b45e050d15521effc4bbb4ee28e829d6195465529d511f3fa0e6f37afea3a9f4f89ab1b4c448f5fdc570b58757f22a623d78952bcfbe30ca3062fc0ef2a2959774d1779c93da2f02868c476b53f12eed3b9b2a40cae32b14eb790dade5f311c9f32105e6fd07d4f5e23ab44f8953103ebc8ae9f7ce1dc53518bf03d570f52aaee905de724768ee051d18aed6a7e2dda7756d5829d719584ac32b0eabfe23eafaf12ad615defb63a14a2f18a357e0572951c5451ebba41779c91da3b814745759a8fe3bb4eed236ac0cae6bc7e207559f7f50a831c35c22fc06aa5478f7155fbb41779c91d777028e8c4a4547eed3bc49793eff6ac146a8d78d788ef8055c3ea0f7951e2aceeda2ef3927aeee051d18ded9fe1f2dda7bba9d0571b029fe9ea7fa728b81541f495bec329dc3302aa7fa6a9fe9aa7fa6a95306ad1523bcc0da6aa261cd98462b4a7506bc6bc479793b892492492492492492492492492e2492e2e24b8b892492e249249249249249249249249274c92497178b507541cf2a5415677882ef3923aeee051d18ded9df97e5bb4f76d065ca61e80ca46acb07d331385472151b6ae8430740a7484a65a3983e9498ea16f3f786b64a7871b4e0b4b4560fa24ab46d511e5e6b0d61ac3586b0d6179797979ac2f2f2f2f2f2f2e2f2f2f2e2f2f2f2f2f2f2f2f2f2f2f2f2f2f2f2f2f2f2f2f3585e5e6b0d61ac3585e6b0d61ac3586b0d61ac3586b0d60af15e3aa8faa2acef5a2ef3923aeee051d18eed9dc1bf2dda09eecc1379ca2d29b47f31ac1cfe9f12a3fd78189eb68a492a6119cc835a5bcc2be0578aff23941f29e1e62fb30469b77a89251a422689249d1569c8f960dae25735e6bcd79b41b41b41b41b41b41af35e6bcd79af35e86bd0d7a1af35e86bcda0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0da0d79af16b8b58574efda2ef3923acee051d18fed97837e5bb4105f75e01a53429a1895f22e51f560af8a1ee9d1864e730a9cc310a9d03d79c7394ab5e0c456bbd965291281a81d871b484a655a36fb0d60b4c54f6a83246a687d42f24bc45d188a62e8924924927d8927d89f7fa0bbce48eb3b814b463fb5fcaddda685f75f2794946f4159b70948a98731d848e8d3834fe230ebcc5370f5e61582d13118647189a2b4d7d8a4c918d11ba5d4c630ad4f985a22b60a69223482a339c4a26a47323421874e61a854740af951a8415b98a2e910aa9cc54485f83d05de72474b8a3a3947b5fca9bb413dd983794aa0caa2d418a2b64af4e7d7f63154ac768c33a14a15065435a23869558728d1949fedec5168d41dcc85d3a18a350a885a56a25360882a1035828f6a28e481a501a57e81179c6b8b8aee930c2150afd3f07a0bbce48e9714b472873d445ff00c5376820beebc2c94875456898ae7293e4a6a6213d7818fa726ad46273987939d07e215a50af714d47218c6f3295521cba10a3d034c4740c5112446c0d1da1c840839c34a6a54a63db05410a0a354aad941cd8714dc5c554e730ec810aaa555f83d05de72474b8a5a315d6f0dda082fbaf06c2930751b90a983e728b206159debc07d3bd4d8d07612d52834630ad8592961ec29a0e718b7f32957acba10a2a354acdb90632044239b43d44520774e8738a635a48f492b268c3bc6a8d592b61e45a6a823546d11ad814acf1df07a0bb84f63923f98a5a31a9fc49fdd376820beebc13ca6e18f1cd4511a8839d0557faf0183214accf32828c70d72296a0ab054a863ea8ab3a68b86a8d79cda2f842f1ca2386387748aee615654a6a53a83d4738ada18e829be44511c4229621cc2b87bcad527e1041779c91fcc52d18fe967e1dda082fbae855b14c3e2246d412a0b507d5f32b6239ca2f91ae82bd6f328e239ca75a447978eaa57c4c188ad7afb0c740ca8238bc5a82d52f35a23c4a85fce54788e18e11c2bc7d41cb3a69d48195644717170ae1d50a957e1168bbce48fe62968c7a73b382fcf76820beeca7595a53c70dc720ec721571a3aaaa94b1569b715b11717414f1768cc78bca0854c7156babbda4740958d70b54bcbcb8479ac2e1ce9d08e35a6b4577b28e81b5c4ae6bc7571d527e1241779c91fcc52d1ca9cce67e6f9ef105f775c4fb51a67e3341779c91fcc51d1cadd2de2ede20bef34d2bf1aa0bbce47fe6e251d1cadfcbf8977882fbcd34afc6a82ef391fa1dc4a5a395ff0097f1796f105f79a7dc2f23f42f12968e56fb3f17f8ef13eee7923a17894b472bf427e24ffafde2f23f42f12968e56eafe66ffd77a82fdd426ff91faabc4a5a31eeb9b1f87e5dd9c91f75fc8fd5f12968c53bf8bc13bb74a7b85342fc61046e63b9724757c4a5a313d7f7847b51a54820820820820820820820820820820820820820820820820820820820823da8208f7ec10409ec4778e48eaf894b462d22a7be277f24924e89249249277724fbda7db9249d324924fb724924f79e48ea7894b472953fe6fe9f5eeb2493a249249d124924924fb13a649d13bc9d13dce49d124e89274493ec4924924924ef249f6649f6249f77cf7ce49ea7894f4728a7f03f82ff00d84fbc4e49ea7894b4728a7f03ff000afcc4f89e3e1de4aea2712968e504fe17fe1709f142fc39c95d4429e8c7755dc1c27de27257510a7a31bd0be3f21bf789c97d4429e8c5fdbe3f21bf0a2fc0089ef0e4bea214f462bd7fb46fdc2c11efee4cea34668c57aff689f0ac102a6e208d104104104104104104104104104105a41696969696905a41041696905ba2082d2082082d2d20820820820820820820820820820820820820820820820820823b9f26751a53d15ddebc0febdce08208208234410410410410410410410410410410410410410410410410410410410410410410410411ec411f1af26f51a334577f3647dabc7ef13937a8d19a2e72ff0033bfdcbf52df52a5bea54b13d2a9627a552c4f4aa589e954b7d4a9627a552c4f4aa589e954b13d2a9627a552c4f4aa5bea54b78e6a5bc7352de39a96f1cd4b78e6a5bc7352de39a96f1cd4b78e6a5bc7352de39a96f1cd4b78e6a5bc7352de39a96f1cd4b78e6a471cd48e39a91c735238e6a471cd48e39a91c735238e6a471cd48e39a91c73533cd48e39a91c735238e6a471cd48e39a91c735238e6a471cd48e39a91c735238e6a471cd48e39a91c735238e6a471cd48e39a91c735238e6a471cd48e39a99e667999e667999e667999e667999e667999e667999e667991c7333cccf333cccf333cccf333cccf333cccf333cc8e39a91c735238e667999e667999e667999e667999e667999e667999e667999e667999e667999e667999e667999e667999e667991c7323d491ea48e399eba48e3991ea48f52471cc8f52471cc8f5247a9238e6471cd48e3991ea48f5247a923d491ea48f5247a923d491ea48f5247a9238e647a923d491ea48f5247a9238e647a923d491ea48f5247a923d491ea48f52471cc8f5247a923d491c73523d491c73238e6a5bc735238e6a471cd48e39a91c735238e6a47a95238e6a471cd48e39a91c735238e6a471cd48e39a91c73523d4a91ea4b7d496fa952df52a5bea54b7d4a96fa952df52a5bea54b7d4a96fa952df52a52a8f454447bd13fb3dc9e651c3357f9aaffeeabffdc4c053feb57ff7d6ff00f43fffda0008010102013f218f80927e66205f24b6c7b676c2e752e91f013f35149ff47021687602e7dc973e48be260825fe91d5788eca5dea5c8cee23e46249827e21ff00a863676b2e752e1177c84527e21ffaa83b5177a9733c08bb644210842108421130210842a10842108421085442108421084210842108421084210842108421084210842a2108421084210842108421510842108421084210842d855169210aab45550a88421510b490b64ec9e695dcf0d88842108421084210842a108421084216882d1042108421084210855108421084210aa2108421084210842108421084210842d4802d1042d0085510b402d00a84210854210a84210842a885a015085a010842d00842a1130216c3d93c9745988ceed7a042d163d06318c918c63d07a2c63ab1fc0aa2108421084210842169aa2aa10842108421084210842108421084210842108421085aa5b4a1085afed85d19f4235d102d063ab18c6318c6318c631d46318c6318c6318c631d0f480c6318c6318c7fe7800004780ff0ff00fbc0000000c6318c63a8c6318c63188982635ddf7e977ec7bf8235b0441323ff0092c4d262b10c9d5c42c1773c08d641104ce92ff9144d27449d4762a177af823590274a29357ff1f892692132f55df7e973ec5ccf0235704133a50493b6aff82c5249d5f765d173af82357149d182096cc85a31ff00062a4102757df97065d08d8c64b658d49ffc1c813abef687b782363193b2c1124bfd9de2636764978893abee6965d08f89e3659ff7b2755dfd0cba11b1f3b3bd927fdd5e27ab41dd9747b782e5234a3e3b5a112924680181a205854b034aaac2d0a304c2308c1300c330b428c3a584611866113112098ff2d7a89d5f765c116f7f05dd6577e32218ca3046e20e044787fe85e196856e8dfd888708e9c488f08dddc4e19689e071ec6111c0cc9851be7a5927237f6170300c08b85e11ff00860466d30a3777308c2cc181047023ff004c2cc9844f00c28238114308c08300c08308c030a8382209dc2c9751817f8ea757dfd2cba17750f4177e3196d1fcbbca228eb2451e7b1108587b845f5e5c9cb8891d63b411310b2b25937b94f90956e569f876821465ba58ecfaee32636e56c1677f0864e47a9ef2596e56c21fe7642cb32b05e3f5997d9130f3c089cb0387d7965aefe4c7991667023d1c73bc9f7dc7fa3cfd10acfaa4d24988f028f2380ee9c567fc55fa674e2c1358756865d0bbacdddb205fd53d0784c41608238f387611c09a1e6873e90974cc41295a5295145145145105260249bb8c96156ea1933fe2ef513ac37b119e85d8d62eeae3618265ceb996d1cd0b4964b80c7a7232d189a291a8a67586318f4592ca92022581fe4ef513a701d7be2ec7d919e85d8d62e6d8f610411332e679cd629541314e811c3c09e2e2710c1824f134da481b62892d41105911b5fe4ef513abf38b91f66e2e472f97a2cc4ef4ef9e748243644f691c62216e37104c5dbe1d2190f4451b31f53da48673ce7c0ff41bb8b9f5d846dcfc0949e85974235771f24324625fb62ba40b9f525e7f93bd4ceafcc2e47d91717239694e96e7c6bee7c89be79cd1f13146298bbff10761148b8fa1f1f6175ca0b4fb82109cfccb7267723f0f24a24b11171f5e02e7a7823131d085f9de3652b78447df86c95d9e45f7caa16a5085ad7a37e99d5f965c81171ca345935cd773e2fc14e67137f34d3763a29f94adfebb8b282245f00dce459ede4b20c4f38befaf23a60ae9279bc0b23784df9233b90fec582ec97d5904a38e452a6028b4904a482082528256414e51695e14a554a104d1243968516841268e41380b590416b28828a4c292c9e37130b5d7e99d5f9c5c820b8e5a884d0dcd199f86b9a7218937f34d52628f902195e0cce344ac7df827e209bec2d48db0a193eea83cde355e67811d42e1f088efb0dda2e497d4135e21dcac408d67fb58d2e47c2f0060d8df269c99a9e39a126b57e89d5f97e0b9145c72d62e7c6ece624dfcd349665817768a8ebe0e8d059292e3ce45d720b98208f593ee7865b59c0798f3a3b5f61df4f1a51c06c751fd60453f4d8991769dbd91558810505104145145104104104104104104a544a5041041041041041284d115d0ea2d2828867d0f532ea7b8a2d326742b309a7ae6757e5f82ec105c728d62eeccb4c4ec16cf2fc8ee1a1d04f6592580c737d5b6f78a38822bf77922dfca43f7f0212188bef8f2470d719ef0869d27146390f30e6c5892e8d7155780be57f9e0e1f470cef3fbe4fee8c876870d6b59d5f9de0bb044975cb58b9b3276e2c6e392949b066b72de2770ac1696d1b7504a258a6cc9be9328884fde4d4449251cc2762c0810934962d9e0748db73d8e1f47f3c9fdf24fbd37e85530b584eafcef05d81976358bbae9d29a42cc02491dc9bd67116e9e0967b10cf789de2910c96ba9654df04f253564885db04c2d05b320c54116d4d6daf6bcf6207f3c9fdf24fbd3bfb0d8a2c63dac2757e6f82ec52e46b1775d33a2c2e24c0a3364befb10fefc0cede07f42796c232be2776a3c454311851c9d619104c7cc74b46105c5c7b84d24627121198de4ca6679cf9189e111282444fb28e91505b10f99cf62070faf24fbf24fb274bf95d7556a89d5f9be0bb14959ac5dd8da12a864fa23f846c9e5e703bede104e5f4587d7e8f767fe062636016b2569ddc905844d353648228bb09ec58b2b08c42272b4eca4ea45622e7d7e915f8cf61037ed079a7c90f176e9ec406f511c647095c27b0e4c6ca616528db236e81bba793fbe49f64e7a697f286452bd23564eafb19f078297358b9b04522fa76504220cf62c3a792ecf2f237f997e41dd3f4b1e4f02ccfebc6c173ce27762f966a59e77124cb52537b948c9677177f5e48479ef2439cbc4574783b9f22fb9cf93b41748847382c18c7891b20cd1bb64d810b086b9eba36f8f470faf27a9f24fb273d08d0cf63f867b90b0510b09bc63d493ab8f4a7c173e9ae2e6c2cbe4ac2c629dc82df48f2584f2f2229f3f027c8217f29f24ace4f083c0f1b05ce389df8bf158e59dc5b742d8848fa236cf2236b3ba9dbf5f25b397811f1f14d2b2e73e447d44349df40c9cf117d293b2f86c778dc159ae4d651121332413490564e85a1a2098d4c40d25826c21a946bbf87f3c99ef433db473d8fe119eb4bc5c926f9d5d3abeda7c10b3e94f3ac6a57362bd5ef31360fc3c91bf97911b79a443cc0978fd2d9f40c67978d74e8fb2793bf1022c2c04c7d4f7823ea80b689e6eb221729ed25a4fd8ecfb8576f25a65bcc8780ec9b8b6e5796de73e4ed3c48b676a2dcb47293eb0f0d973a27603b4d04c269da51634a2be36d283d380b4b62e68cd1c91144d1522098a2ac7a3f9e4dd9e3433db4bf8467ad2f17249bf564eaee797e1f85209e133ac5cd8d12390e5cc6d0944f210733cc32390b05f464504dbad911433470f911cf9a30430bc71617389e9043bfba3b4b38ae24266326f87611bc8e63ea7b8876f1ef610ccb7c3b10c13e1d8984db892a4f8f72126314e8208761acec504550b1d72488642e84d82534924d88d9ac40b91b466d8daf608a34520eb5694ac69c3e86f02c1022bf5d6fe1fcf267b93eccf6d2fe119ea4978bb24df3ab275775ca7c173e94dfccf3ac4ddb1a87cc413585b8e8465f64368bce73e0441b57280ea9afb853b571a16637cc8d022e1a448a1422552220267aa5cea53311113310a90a4421861c618610c30c30c30c3934cb152dcd6e68e0882eaaa587125a810e2e1644db15419a2957eaca9a91715685320813491a0166d9668a29fc33dccf7277fd99eda5fc233d4ddd4bc5c26fd593abf07e173e949b3296ceb1376c513925dd2ce46c24bac113e27c897cc774363e82d5cfc88cd13ee6b9a1b14d639ee229cf182214138505144cc0b9810c0ec24ff00e5699b851380b98d8c0288bf70d7b898770a6495849ceb524d0b85dacc4ee2fa21a48424d1b4a53437510264449b628c2da1104592d4e822c08a2811569850bd01fc3f9e4dd9e27b19eda79ee6e2f5137cead9d5f88b8116c19571d626ed81130417a08046b3b8633bc4c308be0d9fb92cdbc8edcf7bf502bd97b209ac8279cf02635d9864e664e502dfc8fc89ee2c9958f83215995b024c5fc5de60b3b7649635cfc32113318f8085962871dbb24b32c18e1c62bbc0e17d7e04cc43e53d90716e580e1fdf9110b0385f53da512adc3c2d1c3fbf622632e303bb94791c769f27b0e3c782243f1fa3fdf259e4892214318e09921a5140e8e74dcd64924c58178c25ac490645aa092046d2e54ba4da244c8b45ca2fd37412843d30a491256588acb104459159374fe533dc9f7a7fc33de97a699be756ceaef05c08335e2a4ea93af41669938117242f737492d65c18b53cc5827c0b5e3fa173f73dc6b078e4b1671ef2212c667c116fd3b888b6377e886a09e4a75b28711cdf2411bcc6cc9899b8c6e1d88e3419b998c441bf87631046fcc98c6308de6366696318e6393c53128cf10c431cc631846f310c531e8e218c6318c4c4e30863792064451775b24da0b3a0a2498112010d18108a28b658d0a4daa6611369603495a48b946df41b0e45a4281e22a57e938bf256d3f94cf727d9fdf1a5fca6e378df37ead9d5df0bb432de2d6376bd0091382c9c820c28cf9f04d0bea44d82276fdf92d752df624ee11b938f612a638fe1359ca3c9e40b79e7da21c22e9fc65dad892052c7318c731cc7314c5314c5310c5310c6318c6318c4310c4310c4318c6318c6318c6310c6310c4310c6310c43189a2e451775b3a2864435e56ab01c4a6819a7152b9499416a945b2c06e8293416f5fb5a4e1fa39ee4fb27df833db51bc5dd633ad41059cbdad63713ae9a8d157d1e048464624f1ee5ca7887c420b9cf230b30113690bb859de48e415f60c88cae20884e56976d081dcfd884d7fe5ae4122766c13c1884e31e31027429612229c53930269c28d188a0c188a9488a5a4c89a24209333a39ee4fb27d99eda506e256d337ecf9aec0831bbc9ac4dc4eba4a68a6230965dc3e1ee45938905a8e3f85873064b90b5e6f3113d0b71f51da444fdfe89d43739fe11088595a2b0bfb1b3b57f9a1bcf05f2f3b20993b368743a3da969e7b927f4cf6d1819605b1226fd17a4ceb1b73ea8a5c3c9ac6e275f3096e662702c3ebf46dbcfc101b27ca0cae58f78ed721531f5de4f242dcf392277eff00c1531f62cefdd3fa27cb8932fe5ece09fcf93ec933db4e4a35d0ceae26b91f46e2ceb09b89d822862b8c6e25b473ec2c531951395e4c96e31da09c64e2787d4ce788999b49d897e64891b11423e7649f667b1fcd246bb79d6046c8fa37105ac8dc4ec512898621756977f6323eff0008a56578be8bcc9ed5c67b93c933f34a074517fce67b93ecfe99ec7f34523e9b2759ceaf23897233ba8f992d622e27654e219de44622f15dbb13b132fe75560fa6df9c9f67f7c19ec47aa5d4568393b3f96c4dda296313d63588b89d9a106e24b6cd3f12f8c88ad387b346deb4b8fd99ed562a93048e6b49d5e6f13733b892c64dcd622e27e2e21d162730eae4edba134f405e60a54f3b76981b949249912e22f1f5786222318c6318c4104104104105145105a105144145104144105145105145a54514414410416841041c0e09813032e84c2094a6ca1c327d729d5e4b183773ba9daf87588b89f8b48411116117026102ab8838130fbf0cb12907240a251046e204298043bb7fe91d8707dc9d9e599be920dc222210c9bd819b4751830236407bf87f83047ff631269c99a92081bb002757d8bcc1ef4cc38758b84fc5bc5841fb1367cbc08bebf69b1f73274293b05294114ba9e7fc2e44116983522d185a331a88b8a7768589746ce14318880bc45e2208271138882711451788a2f1d00169288208209c44104104104104104144e2271104104138931145105169988a28820a2711498d29a4976133abc96307b924164ec6b4bdf17745941fa1340be27bcc46fca43ae8e89622d69ccdcc804f7c674221d416c50a9229b34240da2b168b8c5910a0491292268b1238bc74105231f88c30c3711872391c8c30e472391872391c8e472318c631c8c6391cd1c8e4b4b4b472391c8e472391c8e46318c72318e46391c8c7231c8f64a75792c60ddfb24bfc966b11f029d5c2222086c271dc41d8348262ee24af26615946408220404522399fb1db884b94e8cd8218124a8226248d382d09e449c098342e9dda09249992d36a6b846876244516e2f4383cff0023ceafb3fd8373ec920b5bc9f8b5c4188263a8eed4d59fb149891ca288c854519781924d9f88c21194930a6902a0b83ca242d2c488640a4522a6824b63371188bc881c2f1768bea7b01e29a54cacff002453abece3cc1ee7f49631f310b41941085ca4506409ea1cb3027804c2290421c68415d103f95fa20634be46c1124ba87108409227651f042cd3604d915c3ae1492f17cb2a853cc41104c260604a0822c2464ff91e74e342d65df07b93ec9b8e118d697be2e1982ecdd8436a2c278c166073e7464aae2da458c0e8443ba382c547d8ae47e937cca5f2ca05172e24e145b37496314ad1041585a220c93713214913241baa30c149798a3cb1f2e4b813502a24939ff23cead7bebe60ddfba225e0eb4bff00177714a3ba4b5e890426238497bce04e2644482dcac172b0812885b496b4423f02c5613e471d22bb6088c24cc12c178745374130aa15247043426e68e8b57e4882c5050c93fe469d37a17fe9e60f724cae3ad2ff00c5a0208c5a4134ac3af92fedca0bb72f0202968a89b57b40957c082142c1c4208de6f8d10ea30941bbe89a24921665a505d158f5653050419a58a378f265ff00922757f8f9377ec915ad217be37638be4e20e3465c4eb66f822bcb5a2252704f78838885e322c9a2cce8cc154cb23d32c20b5a1092264ca4668ce11466965132ff00c9d3abf341bbf6490e8babc7c78c89712663ac110409826ca5ec0f5ae47fe5a9d5db8e68373ec992ff009deae3e05816c8822289ff00291b746853abb9c8373ee91b679656ae3e099d8a2a744ffb28d02757d808dd4de63efab412f94c88924927fc9c6db04d609d676237697797ad27571f131231ff00b48249d647a0d7cc8a4ffca620992759d9cdd24b519d68910ff2b05924c7c0c085f1d0249d6f6137091e629ebb124c6941f4a7e062044c7f8d8f8f88a4ceb64bc3b9462eef06ba2464c68b1c4b1c2ef822ff00255554555b3c350b4d54c992675b246d1bb4b1f5d7c48e8842220810842108421084210842108421084215084210a888208fc480007fefc42108428104105028140a0505858282c2caa10aaa0b3410a88b28ab655084210a884210842108421084210842d01188824981508421518c99d7cd1dc8a7dc44f99d822489ac7c1ba2646318c6318c6318c89d107a60318c6318c631d46318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c74318c631e8063d106318c63d1c6318c6318f62172290ae2f1b046c6f403d107a60318e863a8e86318c6318c631d0e86318c6318c6318c6318c63a8ea3a8ea318f50018c6318c6318c7518c63a8c63a8c6318c6318c6318c6318c6318c6318c6318c6318c6318c746318c631d0c6318c631ea623553a13f49b0c46831ea58f41eadff00c2e209b09d449742e472246690d3fe89fe6e293b2c4933aa882e12648de5dff4ec93f9a8f8193bc2e9245e52c2ec6d93ff002793bf2ed2de3c15c8db27e590bfc12f8e93bf2e523606ec72ff00271243e7d529827e36743a364e6fdb09f9a817c7c4a499c6b606493f1b244aed20e3a7f8b10b4508558a82108421086a150c38c30c30e38e38e38e38e38e38c38c30c369aed5588843c9349ebb8da97c7d47f7d93f0e02d86485643316f18094e099f3b0c40b50016ac009f841ff00ff00ff00d04a1085420a050281088aad5318c6318c63d06318c63d17a0c631d18c6318c6318c63abab18c6318c63a3d075631d1eb1085ae922b945da493257a9f4944db27196d6f45d18c63d53a3a318f49d18c631d1d18e8c75631e8b18c6318e8c631e8b1e9318c63a318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c6318c631e82d749d81729be4e65c72622e3931399931399931399931399931171c989ccc989ccc989ccc989ccc989ccc989ccc988b8e4c45c8fd1323f44c8fd1723f44e391889c7231138e462271c8c44e391889c7231138e4622647e8991fa2647e8991fa2647e8991fa2e47e9cf9189cd9189cd9189cd9189cd9189cd9189cd9189cd9189cd9189cd9188b1c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e7c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c4e6c8c458f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b39ba9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f673646273646273753d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b163d4f62c7a9ec58f53d8b1ea7b39ba9ece69eaf6734f57b39ba9ec58cf57b39ba9ece69eaf6734f57b39ba9ece69eaf673753d9cd3d5ece69eaf673753d9cd9189cdd4f6734f57b39a7abd9cd3d5ecfbf57b3efd5ece69eaf6734f57b39a7abd9cd3d5ece69eaf6734f57b39ba9ece69eaf6734f57b39a7abd9cd3d5ece79eaf673753d9cd3d5ece69eaf6734f57b39a7abd9cf3d5ece79eaf6734f57b39e7abd9cdd4f6734f57b39e7abd9cf3d5ece7c8c4e79eaf673753d9cf9188991fa73e46273e46273e46266fe873e4627df26266fe873e46273e46273e46273e46273646273646273e4622e3931171eaf6263d5ec4c72622e3931131c98898e4c44c7262263931131c98898e4c44c72622639311c7644280ed0236de8fe0cc835ffda0008010103013f10cbd78e84f418c35268ab1895551e1781e178155e0545d18c020d0fa0eafd6ac71435eaee1f5a6a989d5102548a7e5ee87d7b87f9afe096f4b1d26e8757963cf0220827a4fa2aaf02c0f0a10f0531610d51e09268a8fd52e92547fe057566af5208205fcfaa3ee0f035f464f4502557d06318f1c634245e86a1d10d7a378a49c4854684a8512e91fe15741089193fe1e3a49c424b0703f777479b6d8cc77197d04511237d363eba13a17a843637d17d063ac9359e9a185d25d19f58a8d8de08f4d04635863ab27dc82db4ccfd1dcf91b397ef1f1e9244f4dd5f5984c6eb3c6fa304619a49352c0fd0bf46ba0fa11e8d609c2ba4fa32343127f55d0f1ee328fa350474ca07e8c1de7a308cf0fcc9fa6ff101cc9d695104a85878d89122448912c21180489750004104104104102441041041040d88a2082082289510451041045104548c01311520820822a3581924f4160424fe4b0785d986dc322175a08a15155ef1df65f5eef82a4fd00cf7b0fd4bbf38dd15fe03ff00c0218e143c190a57485f785cbd2fe62c57438e3811d28e8cd66a8fd4d941f7032759041081526a4924e1061e009249a249249c0249a924924962d59a4e1638a5b04108b10422152082288c40412092a3c01041041045114411fe1400003000208208208208228822b041158c524e14881a1861874463422302fe4d51e4d8655efb75a8a084924d4927a009878573e91fe64c9f56e82648952e9bc2e912c0244a89e1b993a664c417aaedfc03e5804bafc10cc912d8913244c9e2fcc912c1e44c912a9225d07f3e91fee2ec40fa5f4be020328365d4812a4c4d229158c4c7e827d13a3b8d7a7558ff000f04114440c648fd44751d26835341a19782090c76c6ff000bca3ec683dccc65174d29c437544083b0dd1bc2c63f4b349e84924e06bd42a3ff00148547e823d52a2ee20d0b2b740c9ba2ec534fd8dd0f6dc2501f4950681bc0aa7a3744924d2463ff000d1e85625478d7f849249246f0af54ba4a928d12a747988b90c9e82cf67e07d4339699f80d23c3388b18a55189a36493e8231220525d258955d1fa09c2aaf0c7ff0026d0c77425c4e9fe9e51e436b2e432f4d476e808499269349eb40950e0b1b57a463f4a843a2a4103ff0014d11d7447a756114dca1f45a159d7ec5213eece4111d152d43759244c581327d11292d58644f027d13f5738231cff00914971d14475b41b2e7493a7a8fc9464ee52dc48e5231cd7396aab649226317e262c13d18a2064d81f5a2b18df49fa09c124ff00874c9f416a178cbd32b284a1581f451aefcb0b62fb6efc0cb46ad4689c28cc3daaea86c9c6edd661d98dce381f5d34585a18bd64fad5e9271cbf4f2499871b01e242ca370b6452df3739443ba10e9158a319092475437a64e072e8364f5324924d67031a2291ea63d72ff04ba53d06a06a3e8927f0d0518a4f5bf80d6e043526b02c8b5ab25247543e82c0f1ae94618a229326568ce50b60e038c8c2d824c8e11ace5338e28a2d05b23db38a931709c6708d5466bc20a6e338c7b42c1149d02d28cc11074a07d39ea47a7927aaba0fa03f433545dae350c116c8323b090a924899a198769a38c27d5be8b208a243206342b8ebd88495aec8d4d1f732d0d565c496965ecf1fb2ccc6213f3171395f7993d9b6e49459c5e5a77c792ce579fd49f621a27f684e8f67ca943294268f2dd084cbc50be47906a709599a364b256944a738e24d48c59fc96e75192dacc8e675165dc695e9db741778d9b2c4cee9f04536da74f70a6fd6526834b4f60a7bae4a39c8bec7b69bcdb67026f24a9d3616f93c1ff1825689fb1ab1b4e9b0ad7369b5ce1af63ff3b7385f05bc83d9216d17c119d8891b06e4430e8250d0d74a3a8ba6ff00c0c8de3cf8f78509318b521628e58c8ed891362d4375e57ab440de191604ab22b99c2109591c164025ec9bec98f96b769f412496f7b98c876f6ff44467bcbe69121cebe00509c24c0a34919fd2ff0003c9ad76ebd90844fbfbac1f513e4106dcfd0ff038df7965b484d1cec91d8089259687ee96269a7cf9026e2d5c4891477fc1c89e65bccb484bb1fb936ae121ddff0002946dfc4509436fa1425dbef31c36f97dd421a4bbaf850132cbfe05685aea3c8650c213f99a81a7dafa809ec2d1b0928f6fe88a33dc779cb37e208c7ed10869ff00811adc7f441708571b03c4aa761bd32acf4a7d5cfa589e4257e6c65dc64beec6476ab13ac8e8d8c65615d4759c68918893242e84d123648f59185a8e7033669b908d5a57bbfb3e422347afd99b3fb11dcbf58f726ff8108ad7d8e2cbf621be7c9f70d08ab4dcb328f91ac40916aa4ef440ec254dc5c97c0b7869c0919321c49d8a1b91616e243dd919c5a8c1710dea4ebb13982910b23204351893a87e8649f4f359c73d77e84dd42c3cc6847d86645fb98b6f7617e0a40e8955e0e461589312c4f026597261f4670e60411c1b063ca1253248ef76376489249244432484126c8e011a2e2664309620365b8f049249249384249249105ab90d1649725b9639e8bf5cb047ac82293d3362b532217e50d73ccb54f71f516048746363a6732b0a435e9189c50a8e8b03c3b129c924aacc1b23f0e88491331c18d684453641c86e881ed10252c8697613ad324c6374d40ba23314d7b86c8c9381569502e708696ba1ec0d4741e09c3033e85291fb3f045e807d75867a8bd4c604a8de0c8eaff607b47fd89685bf81be251ba2228e8d93464c1047467a2f0cf4a706c7c4232cf89e663c8e5e6a7b31610f20d5a58430d3542c9282e0b73ee0bcb7081425a258696ec9dcd7df6a15912968f1fe92cd2894d96e853a5a882695ff004282550a363656272e76775266b353f61a79ba2e5ed223424ea0e2af1e8751a852ff00c585ff00044e17d143f568437d518c2b3def0a159f2f07d70aa993566862c591031fa07896378decec68a2dfbdb890d5ec2d36206a17739721f60da2de4ee4647cc57cb4211c9e344993f12c8cee9fa0b7774fed13325b6e7460c5b97f6892e7ec80995dac69b1f07c97eddc4759be1489ae1c5fa1d147da78c5a2b72f4bec451e1821ec3954b97adcbd2fb62422e3921e0865f62e46187b12d896c43d88643d8864320864325b12d896c43e9c8f020caeabf3df80fcd67e44917cae27e6d30274308c8ccc2c210a8fd4b781138996a8d02fe9bc7fab7125a17216848e1cbf825fe3511cd6cfc5a21ec3fa6d0c0b3fb825fb03e6e41ed3b79508f914e3f1663e46e2e91f867ec6c5f7f9bcb45fb3212c3592f9fe187e45b0740fd06a3c24cbe192f69f8c1b2e466aa0438c86ca4d383428edb2de4a93d18a0f512169a1ac9ce0126c8e2a293444764710d992b91e03568476477c357a1a447623b099a0d76a0b69105a0d361aec886c8e01aec23b1c02d821b216c23604764849b0ec07b647b10d841d883888ec886c71504aa0a68216833223330dea22c2323a8a1bbdfe86bff5c8423eaab249236264464c8b0b42f5e2c6cfa020b27fe56e3c3228b911fb417fb93edfb07b90ee20ae27ee43a47cdf9ccbe010f13afbae89dfa25114084bbf83337d8cbbdfce3c4f67e08f3dcfb9677ffa4ddf8fe93ed932997dbf133f6cc98f3aaeab4a2340ff0013f14cc6845f12984ec41a1c270161d9431d834d869b11d886c39683d22d01cc6654a3c04362f320b8cd39f23b30e21211bb354aaaec3b4ecace420e8b1d84f63b46db12db6fb34d8eddce01d0cf453aa126c4531455d29a3e26c58a036d34fe9907f85e2ad9347811a0cbc123e947a855627d0d27d51f85e610ac4b091ad8233329f88ece949043d83c25faff00f513b0483b13b9cbf90bf71097096a7d10b5f99929eb1e4445a5a47c84c5397d140917d19739bafe05b2de0f9118dfeb6c79bc124f4f276a4d7f67e07b62e4108110b50e01425089ed1c152e038078e00860f0402d4237a0812ed505d10282234a240811114088d6a5016c527e41aedaaffd091a4216f61173ecfb1fc5234687608d85ec4d241a12e82b45c70b5ba998cd82ba13dc248ec1623f536abc68d0647616078d550f12764c98d8744ee66eab1fea34c0dc865fc4deac6cc52670c59082bfd8f2320d845a202ec58b3e014e14c3492258841a2ed413ef35d8299c107a21fd9adb22ec2f36a09ef672dea4b8d0597696143bd8e7e1421bc4a17c0eb248fa6c650f7f66258ea658a4563828a551185d5e174631d1998921212a2a2a475270c9249248dff47fd0596aff00d930bb104f3ec0f5b877fdc124904a2532338cfb0869c0f72113d1cc66c378fea825fdd163b0ff0003c13478d56aeb4e273ab11438a4351b487b90d47a065f0aaeff00537c04c35b18ec3ee11b3637cc7329c1ae37ee6ae43fbb6cb94dc439e42189419a3132132863dc33f634e09eae51b2263dcb099344a148a3ab1d2303a32474749a93d1274589629a48dd7fef813f282fcfb9365d87290d4358fd9604cb7dff0008df1433519f0ba2209b19baafe0e47c148590fa485d15d7c84c49091094a130a0274651f621f2fc62fb19bb2913959f90ca598d759991ca348f907ec7fd9517b8119086b282d44e24425757251a5a587346b04571bb683d3346661b826883a3f469095066ee1040a15748ace07475756319361212acd124f4562917427fa2fea1a7f351e4bb0bc839fe589ed9ff0004df8a21ff00b3553c78187c67f48248c247a5abaafe6e45dd943d3b091da549f4fd1630cd48d33382cae046b22085b4177656fab242bdfee2deda82172ddf7039edd666519288a47e0bd1cb702956d0e344a0943d2d217d88acd5f934cb9250bfd3685a33d57de077e9dc206d99794ac87175044e06bbf283e502d964a3de105b5230ac336f811b15c757503ab5e8321087c2972f77867578a68eb34746327d84e6999aa1d17527a335817fb3fe0b23f35165d82967d858a5ff006c2ff43734cfec9baf6f020d5a3395fd2dd246dbe44a5960d7419ba554fade43dc4234244ecaac557d5ab131090d08d0481ed130ada3224b64c594e22de423b2421b44696ce37f2942686f604a6b7f34686469edd5665d1c406f092e2fb03884ccdcf81292d7de512db369f83c9cea5bbcc5ce85fc053b429a834bdadd96d062130cbfa85d8d196e8ffbb7d979ce7f2047705c2966a7db891793324f2dc5459fa606d2447e5f235a68e2ae8fafca7522c55d5e363649248f03a362e5d17dd489ace0924755810c98270219ff004ff9e0d1dc2c83787bc51ffa0afed1e0da8dc2f932f95e2948e6dfd3ee0ce244330c6e93e89fe66e2d5d813b22dfcdf1c9384ac51d08a18b22ea26ec2104771c25ee140f98bfa0b3fbe42ea9d5ff0042202dd81a58fec7aac6f821ec2e48504594ee4dda11693223b8a736497d16838b882f7c8ae5b5c509e6d7f0325c051f916136b8f1099db546d8d24b5fe68497eb615aeb3ed7100aab596dff003026de2df162a3f417b45833ea917ee4585d5d1d1b1892693557a3244667d8847466b24d270cd1566af2f917ef8332336a12d327fa19be3c5206ff00a6abba1694524266f7243a2ceef4bc49eb3b8fe243b9374165ec648d9bf34934e9b78a71c92319023e84516c40f38ccfb9fc1bc00bd87847ed733790e0520a7b8327e7b3aac784e51b19a0a5634770893b346b0bddb71dcbb9e3c11978d6c42376908f702bdc17b69f297c8c4920a1485ed245937f2150c8e6bfca48cf1ec43da701b24c24c3200faef60b6f678122f609fbdf13c4e86c6cc995311a1355362c8cb8487144e0dd081e1ca4749a4d249a4835323491243b289e2824913249249ac889e373fdff000599d10b56f9a06ee1ff00af068847fd272ee22e8a65ec22ce79f22dc2470f5765d2f89e413760270be06953949b8da5d150faf5e19a4935780b4d22dc4c5bfa4d1dc33e53f46eec0f6fd204dc9e11902b5ef29eef807ef964eab235f710f51e6954345c81c04c2e2109b95087c12f797f057e948852a2b5909e67a780a6bfc91617d7ea244f7fc18a47924a1446764c231cb79fff0039bad11be1f617f24139abd0288ae642617b783d8425b13c4c63632f2b682925616344429e4862940ace4899b1a9d863138e05a166462654a627244890cb50493912a561fb0ca05ac88c586358dd0840de048946a129268687fbe286881f833abf3432f9617dcaf14d28b35cbfe1b145ce484c2f933870cef4caeeff00c8685c917925b4160d87c3aae866aaf04f513a74e1996ef0409132faf226fc3ba3f00c85c5dfec223e3ea3724cfef07937d078909d89b882f266164ea4f9e4b8042b3b33896cc710be344bef0434a97fb32eb39f23470421bba57b1743ba467be5895582d17ce03b40781f0f1b879766cdfb8985992fc60721c90c42e9cf611aed7b8f4a6653f91b353e146063eaa4b1b1265f046fd87b627858c623370a4562344449a881454a95d904e9383740f9381a109119307692ccd17684b41c240b21a5a2d84b8e45ded991083414b2506be4212c84bd08341b390e0c895e442b225631e86c0809bfeda880d1f6635179fbb1ff003c0bf88d29afbff284851d85c9fbf91aeee5e0bf2747361e3a1f99b84f88e8bb217eddd44644e35f49b1ac401399b83cc8ac29a76ddfb06959978c10fe373f64fb83e377c0639f27f503eb4c1615e468c1caf310d80e1f103706cb43585011bcccc5bbd8de4cbe556fa72f4ae7637d0df2e2a81eddb32535a184f627b3380e2380e2388e227b1c0711c4ce2380e262da64da1762b0ad882c21cda1971bc467b1909d898121c32f4366f05583d850cf4ea61164109727718dc1b4215912e86e0812dc2e1d8e12c02dd0e92429c5ca1112a9909163234e09b427b41ba84a5909d0450cf2e3dccff70251036f61fe9d35ff005898d76f07fc1536fda097916353c09bbf33330cc333bf473756c9eff21fdc45ab6d9090f6516b47d0ce677a2ca54999322e51adfdc5fc0fa17b38170ef7f01f887e60e35fc941fa5c84a7dbfdb2448f3d89798467d6721a35e2f21233594837c93cb4e41bd3e85b47e48fd412fb705a9838e6853bcbe88839c38be8e27f07e842d9bf61ff00e6d85eeeaa0348dda1772fa16c9f983f708e1f026e83d9f14f7883ff0004ed3e85fa420e11eda16b2198c242c8a2d68cf7ec8bf1931318eac410f3194667619cb19c8e1d221a1281d401d1612c40890a15238119816d109385451490d0802708564bac55812d12248df4177d4659edfe894ed78441b5ec421129249f73410592e0357b8d5d8bd7dc2bfd7836f6c0aed7102cadc0d5bdfc9730d668fb82c6ccd805d045deff0083e90683f6a7ecef207d2e7fa04cf22150d109c19ea40d96631ce255f516dd257d6c26ebfeac2cf1298bdc1d996baf71a08a68c2b2bf71b29112ae24fe886afd8418207822b304a862d15ce6d1a8133bc45bc03c13652f9eadc0e14b0897680d5bb9cbe719070ba01289fb1fad877795c6c0d19fe6f1064b7a26f976209be5fc31bba374fa04c46529fbcc501eecf7b9f44c63fe3780e745a35f84984e4fcccf248fc4b95e06897b82bdda7c1219ae6be49a6bf6ec908fc320e27bafa0425f7f0914d3bbf866fb136edf69920f5d1fbec43ebfd5f44dd1bf858b9eff00c3c0ff00a248f6fe91f24682732219e5e5bc8b0a79bf8645418f0babc045012d4c84cb2264b46940f9e048545106bc86662c12c840924c60e41ed0f43204d8d65c33a12a0d2c864d1f6961863c842e1815dfb73ec93f2ec7e1e054dfc0c8424c9ccd8d7dc2baed1e4597cd1353f7e09baf6f037fcc098575be4325ecfc9f70b131a7b98560cd8958d08c04b2ecbcd10213a5ccc4ba29361100256c2014464a7b8a4c9ff6847bb9b2c09ffa6d647cb52df6d1ec32effa3389634efe10f5969fab21992cafe0e8f6c1f25e07fbb199b4727e02bb840e6acb1c0d604e290a85e842adb6fa3eb3fb5c4af97cb5fc094e746ed9085f8125f0e45c4f3d7dc3d927a5f2b41b8fbbd83e465f4e45dc27ed241a2f2df7c849870951f59196cb6f324fb95fed2e7dc699babcfd8961da79947d1f23fbff004ee2e67992ee4fca3c11357fcac2795831256e1274a1ed85654244b83910c4e89386c1b59aa1da107b9da4b90d349d1e243a3a27426c91703ccc3105940b6c502c29ab0b9a44090d1848998d189827b49215a5464acc5d522931a15a3742615c40d2448850ef209d05b57dc8d7ed850cff00a0fe42528a60cdbbf813fcf26fd83e61d9fb86bf1e0ce3d8c88a44b560adf5e46fe8fc99a46580f377ac62cfd5548969856ed0bc8a3898df48f38fad06e50887b912de17ca93849778930b747c179e5cbe83ad9ff31ca5c27f1114b1fedc37669cccbc0a14d7ea635f87b391ce38881b2b4275af23e248779c707b05e4e84fb1a27dcb43b0358886a9181ab266a624eb48da16e07b939182d8dd521ca271ca16ea89bf51ce39c4fa8e59cf1ef0e61c8390730e61c83987306ed4730e41cc1b350c79b1bbaa67c8c81e274caae864949e64a95c4bd456ac4b26296a367a9a86728e3945a666e853d46db8a5a9cc66cc935a2a2f314f316f324120706644acee4173c88d2e44cc627992eb497b934c50436910d6b241f9b0a88ec422f87345a7b1b7b793fd0d5f99999f7059fc0dbd8fe134dbba13cbdbc9a7b3f23cb17ec1abbefe98a91651784791216dd443c727d09e728ca1177547d8b1ff00f74c86cbcd2cae025c4fc6c7f15fc3c92470fb248ad1bfb42577bc41fb9e0f9d24134295582a5b0a592d0bc105d8cbea42453dde04211faf4687834c71d19c104755e278b545a5945a55f458d0d19642187f247d84e1ba84a658b93d162d44cb51dae8b86e306ec68f18c90c0d0e44818a46507098c63c384d9be24185bc6635b6e7519748c64a211fecff009e4d07f2357e642ff4365da92489fd347fa791dbd8fc970359f035ddf0c7a0886f68b0b22f6d33b9c8d7e5e885ea09c86b42285390880f23e0a04f71f0cc44e63578886c599851a24fc084380823d8f80fbbbf81689689fb06cf9293f90ecd3fb8210cb45b0b8d93417b0ee4d9ec214ff0604492cef3dac0f1cd608f51381a1a1d1628c0f354fc8c4271318c686a9041045228a2489898aa9c1382270a1d5babc2ce96353fe116f61aa749f23bfe6c7fb43fe0b4205a9cb7a22f917a48bb89760544fa02f3fae65abbfc48b2f6f26ddc0c69c36330facd65381086fe0cbb15dbe08e13af2ddcc4b6c90b54ebfd08f6c87925693d827d8cbf99269a36fed01b18fd2137575fc85a1a0f3a699d94362a13eef709349efeda87bcbe92f5ec74581e154b26ccb28b02c0e8f0b190320820757462d89a4aede9231aab138f934f83fd7f4d5dbc885fdfc11e425f1611349a4a979f713f4372faed6063a49ab6f912387f8334be9f1711fe25f1bc5661f55d1a06c3518895b715f0b3b9a85bc02d7611acf51326da430c97222e36fe82aee77fb3072237164fa08d03fe40f20ddd25f03fbb92669385627eb9aead9c4506f2ba0e8c9a3c2e8f04d84b927bf45d63a5348c6ef4ff0087efb133f7f26afcc85fd410bc2f6c311a2591f2f1226b9c6ea7eb7c960bddeab6547bcdf7d4a1998fa13d16e423af90b42e36a6bccf92049ac27cb1979abbfd1cf3ff00a732d33213ce6cfef0c6ee5f7241210f0c51637e9a49acd5f52682157d8c92060781d1d5e178ac4897224210ab045649c0c4b0c527a102f2356f61abdc373f9b0ffa13bfb0dbdbcd5212a3a446993fd2cf425563427c2f03da4a0ff831cef5e1d599ab147d38a4513a19ad9119f4348bff0005259e56df7c8c595a6751f7374822af03abc6f03f40b03155f5159964cc422688a052d5bc4eaeaf13a37612c8912a212acd2291d558d1302cccd7edcbfe3c889f926132b7e23fd2f24062573331499a48e0697d2ce20d103e82335c7c04b7e6837be868e7893e9e7a19fd02aaa31d918f743f3b7855206b04f412a3607867d02a31e29c10410310d0904895c884eb14b03ac923a3abc123a6630b8c842c1381d174a268b0e742441cf61653c7f4767ecfc8ff001d8ff61388bec59fd0d052e668c8c95cdf0d91f50e34123e8212f690f1a46b09d509661d5fa078a31310c749c520cb5314e42ffc03d9fa17e4fe07648c6ab1e4ac24ee4d92fa13748333f02594b218158fa7381e254820633246a16d495431bb1c312999c8728ad431a91dc4a4771aee4371aee4771ee1cc3dc398e61ef1cc730f70e41ee0f791c8255aa22d51cc8e420d4e65496e1c84da9c88e41ef1cc731c8730e951e05bca9721c88e4398e616f1c884bb8f78e6a4f78b59fe91cfbf25c43ce7c0d2d7d46b1b7811aa3222d47ea33244dd30d3afe7a285f864d0bb987776ff00c3e73baa2cc364f45e148c86343204a91d27d18b41d8409c07d921ff00cc1a9e0fe88c17f5281cc6ee491c8cd44c0a50bcbb1b6285a88e6085fe816323d34492176b8264a025a08b4b17b25aa502350adce719b9c8771dc3e4770f98f99de3e6770f91de3e43e6771dc4c912df325b913cc4cb532e67713dcee2cd4cb9c8a3a9de2819f363e42e64d1df4adee94e4f725b93dc5cc96e4b716a9a1f324779de31dc3e6728dbc937ee077819b99d727751d381f99d1e1548e9a5850cc2932fcc87afbf82ce6ea6186763abc6f021615815628d751114f912bb4899cf01533797b86e6eefa8211296cbc117d397f650c6b6a403910bb42f2467bb2b9085ba7d1cba2deffe9766ff0024546b6fc319b0a667010d0838070c118142151ad085a9b572049644470359423844fa106a2d8dc10d0b947ba31313dd18b90e7a4e5a28b516f1b4c5ba3dcb9cff00672fd8f74e65f273aa6e63987c0730f7c5ba8e7fb1ef23944bd4e7394448341cc8e44738f791c41ad51c887bc89b51eb339886ad2374851668935399584a59a24d55c59627d87354274665c3ecc6f02f441e0d05bfc4ac8dff00d116ceb9f8a06b2e9b27a11519148174590363e82247de8f6c487a53b7f07ca780d1627af9143d8646695d9831e19eee20ed21d0b08d76245b939cddcd5cb2f84333878236f82d644107dc90eb88ba919c49ef5491f9d088c8931440a891efc148922e02a4a6f4c60651d327014f7171ce44964ce50f7d9ce73d1731cc731cc721c8731cc731c8ce6398e6398e625b92dc9ee4f725b9cc4f725bb3919c84bdce43909dc4ee2771c8721c8721c8721c87212dc96e4f725bb16f12dd92dd9c84f7390e625b9c84b767313dc9f5b909f10b2fe321e256b7f145df4d94cd47e8a3a7230fa2b34305f042e489efcc8ca3eb7c852bb64304e9104ad7f1231e59aa23b8149c21f8de460517697c0f6f76213691ff00e0d6af23ed0d09ab608a6d48972224e82dd333a2728f9d781556633d5145802b321ef702ec8db19a2220480851d2915c0c8749170a43de5b9037ca9963de1d18eb41148a4104563fcac8c7be4fce8344fbf83f0b92e9e63219fd12eab63745d09c85a13b086904677fe90ac96fc449677cfc8a6e25c45f10255b5624e143525995c7ae688559c8b838ccbe4eafed0a5beb1e044a695a7eb22af07f02693d28b2d11af8250eaf6c32689464b177944d149b653e06cd33104ada94a6d2a683ab48940c612196c664fa3204b4ca89aec115db93a0912e07c17a2072e0fa2fd2c0a8fad18a30bf40f0f3e1243c4b015a3f341acfbf80b4dff375194cde9de36c6f0bc5122641f082e58951daee4739ccb570c90df3134d2f05153213457571a9e4b60ec33b969bc9343e10879ee8871f1035323b9f08640c5760f61217424214d5fec84a695f24243911aae5b48ca95ac299b0c6bec6971a109d69ca38d04235a88526761912254d668807b34927df0ba411d58ac74df4a291d58f49cd848631246aabec1168fdd0d8bf207cad23e7d6b21751b1bc334785668487bc102b3217adb3d3810ba6120fb0bed5c545c82de9ad10d730a8fb85d85a215316649a79f581b6f29f71f0916a5c0cde536a320494845cb607996a30b4f60906c5c93d8b527ce3f2283be0c9dea2d0cc869c3126f7f2c20cc6b5042a48b960cd762d0931e8bac8166546ef8253d22e84607578e3a1047a08e83c3cd8734625879d18a017e05eb6d596f335f62e8be823e9a12e9c8d8f1bc2b3131b0d0a6933226e2eb2d62ef3b19ec7da8df7fd84e9ad5fd0d7168822f6fd1225da3c85db62190c8b211cb99137d08b5f5fec5a7479a84ceea3410c274d5721a269b10b88437441cf9169f72e086c933f77e492ec4cb2cef99109a991872854312cef470a1172112ecee8f7735a4e40844272f22d8869e8beacf4de09c2bab1d378d8b173e3b15848e8a234705b3beafc22eeeba5666f43109749d5beac0e726d276e06b033b8e4ddbfa21297f06a1361eacfe82517fcc4b1b458431f8a85b5b47d044b8b79313a67f6439b27bf106f542fa18ecc94e0962d3319a31c998b5a8b48b877cc96e24d7922e64f2ce588b53dcce89695c88ae48b310ad264b3a26315390ab316f26731ce209517693270f04626b1c11e81d63a51d48e945160783519ba5820cedcf80fb91b25777f4367e8af88e18c59a9ceefea58e8d8e91d4c872a1b1425111f29132b23b4c4a61a896442c9fb607c4d99c9823836b41620965c66a2e09302a234b9aa45c991bb1e1e536a1475a24c714a90ecf81196b1d63a1633437438b1944609c4c8c4ba518dd174d10358a04bacb046266e99bb195ff528decbfe04cfb9f905ba6ce6533fab7863a885011d435ab1b3a227b8ca10b24b664b76377d7925d49390993818f0c6163a47a47d55d08eb474b57427818bd8f99193b2893db1f57d3ce65337563a8c63c27e888410b05a5e8747e8174a7a515585e063f588780d11ea16049220d5d593f46a580cfd4f33a97337a863631e04c6f48a761079c47fe0d8b02ab1f463d4a5244625e9da2c43726b1ba665e17c04c62e6689f818b223a2d493a6ba6e8c91e0917a34ea0c30debd74608a47a25d1785f45385fa654b4b26994791f4d0a585d923127f348d163555428fa49d4631faa4ead8759f533fe1e08ebaeac75d135492c543e93277968e10c4877ed943a3c4a8c2ba16fd0545d4631fab9249f431d78230c102447a0558c688abff001b1526e9b17bc593b0621fae6164ba2b012638a4751b1b27d124475e3d6452274052cbd1bf429e38ff000da830c3e9bc8f79fc0cbd88691798b87f4128e9c8993aa71811159ea35d3e45d46c6c7e94478a2b156bd0aeaa747fe0b231ff008a9a4a4c526fa514c82fc6f065ec18d7157d2744e929506a0744c52826ecee6174db1fa44911485d44c785f4d619249c522748204b1c1045208c10411482190c86410410410254634310451048864324432086410410410410410410411582081c1ba24452082082421087e808f8a781be831645fb719158207443c09c5052226aaa4689e7a70130fae1ff00a75e74a115331225886bd0b9c021812a1020429889481120408ec44891e94055102361c046c205885b1020408442a102c4221102042204084242110a884422040810204084408102040891224081020408912244891204081cf4bc4912044890203818742de14fa3905bbf3217d8431ea9fc6f06b89d5e14e3002789041041041146410b058b1620b56c58944a25124a244d08404b20448902243175fa1a103d60f7eb33f8f831ff00927803ff00fbf187d15650f15ecb2c31385f49e427e7817e0196c2ce7f2b175151518a8f12626262628600f1c26187fe54765ffd7fe7e48a93f5ee03ff009e5fa6cfff00f67e93e0804d1225804c913278f09e88d74720b67ee4655d90d99bff00c4322c123a2ea2701349249249186249268924924926b24ba24964924924924924924924924924924d23d02a47a25d17818eb1e823d42440d7596244f991b5744d084fdf6a83f01c8cbd2c0aa58952044f51b1b1ff00877d7557d158627213f25234d676c724d1d11347ea1aebc6041af4c81120fa0f23e48259da86347b1ed327b0aa87578d0ba0a9146364e18a47a57d38a411d54bd0ab0991a8ceb1e8a3d224474d605431d63d1264d631641bf5d8caeca8dd52bf23e8558aaf1aa2c2878986fd641185e38ebae94e28a48ffc3be9baa1e044fa358a71e433dcc6b062053e025890fd0c558deb9e15d28e8a0cc0bd0493d5782304e08f4a9493e9cd13247d07e866aab905f98647619ef5fed3e828c5543c0b02e92a31fa77ebd109a888f4b3e8d7a6522157a4b1d354927d7b585edcb328c61193b0e8a8a8fa0ba486c6e94ff8d4c9268721aeb4fa19eaa440c6ca4ba35827149347bd2c3f417527d4e52d5dfc8f9067b87f433beefce1448e8e8e8aaba3031d20822a8823d3c10411822904114822a41041144a8864318c4e3512136c4f6264f627b13a122648e26701c4701c0711c0701c354e2c1170746880244c913264e8489920d5843d451952993ac48993264c4e486f4a64c993264c952993264891227d6e3ac7a0ca7c4bf25886402ec9e1c850423c4f1a4409744bec3c77d145746d0810e88023120448d102152240811204489123420448912184aa04080a070404916c524f480124938c092492689249c2138410b478809268927a4009a249268927009a249ac9249248c6861f5eca7e035162545ad89ee240fcb1fbc6f1212122042649248d898d8d8dd124924d09e06c492492493492689a27009249249a27102689a935249c0249249e8049c2124924d49249249c409f4c0080875eff00c57c027ff80f924d186b1bc7b38ffb1e68cc32caedb4f5de7861a69be1a61049847bca2f30bcc2f26258a142858ea8142f30bcc2f309cc27309c82bde11a008808806b001740000000002001e100000082011a844a022022023d2240000000000000f04412492aa5144e89252f4124828a20a28a20a28a28a20952282201e20a28924825fe0228a20a28820820828a28a28a28a288228a0aa08a2822822a1550404414454454454372a1b951151151151151151a28288a88a88a88a80a88288a88a88a88a80a80a88a80a88288a80a80a80080a8824801ee010010010010dc08008ee447702002002002002202202001ef11cc57214a9430f788e4239a91c238e623988670d50ed246fb62e2d77ff80185bff8c3fffe000300ffd9	2026-08-19 19:49:55.399453+00
\.


--
-- Data for Name: flight_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flight_bookings (id, lead_id, booking_reference, pnr, airline, flight_numbers, origin, destination, cabin_class, prepaid_amount, pay_at_counter_amount, created_at, updated_at, custom_fields, booking_platform) FROM stdin;
\.


--
-- Data for Name: future_credits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.future_credits (id, source_lead_id, voucher_amount, number_of_vouchers, validity_date, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: google_sheets_sync_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.google_sheets_sync_status (id, lead_id, table_name, status, attempts, last_error, synced_at, created_at) FROM stdin;
\.


--
-- Data for Name: hotel_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hotel_bookings (id, lead_id, booking_reference, booking_platform, hotel_name, room_type, location, check_in_date, check_out_date, prepaid_amount, pay_at_counter_amount, created_at, updated_at, custom_fields) FROM stdin;
\.


--
-- Data for Name: lead_access_grants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lead_access_grants (id, lead_id, user_id, granted_by, created_at) FROM stdin;
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leads (id, name, phone, email, service_type, status, agent_id, is_duplicate, duplicate_of_id, duplicate_override_reason, created_at, updated_at, source, custom_fields, embed_widget_id, landing_page_url, visitor_public_ip, visitor_local_ip, embed_submission) FROM stdin;
6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	ram	123456789	ram@ram.com	car	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	f	\N	\N	2026-08-18 05:58:29.729589+00	2026-08-18 05:58:32.430976+00	\N	{}	\N	\N	\N	\N	\N
8bce810b-ca4d-4252-9fcf-43c05d250ff2	ram	123456789	ram@ram.com	\N	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	t	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	\N	2026-08-18 05:59:53.123685+00	2026-08-18 05:59:53.123685+00	\N	{}	\N	\N	\N	\N	\N
6c07443d-6bdb-47b1-87ed-e65618455fec	dffd	rama	rama@rama.com	car	client_approved	87a4b8b0-763c-4633-9f59-623d53ecd5a8	f	\N	\N	2026-08-18 16:51:36.098584+00	2026-08-18 16:54:50.760304+00	\N	{}	\N	\N	\N	\N	\N
7590aa2e-16ba-4096-a11f-016ceee5f059	df	9898	a@g.com	hotel	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	f	\N	\N	2026-08-18 17:02:38.366702+00	2026-08-18 17:02:43.216946+00	\N	{}	\N	\N	\N	\N	\N
3fd31619-366c-40f6-a104-1d7e46a528bb	Ramu	898989989	hhh@g.com	car	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	t	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	iisis	2026-08-18 17:03:34.915522+00	2026-08-18 17:03:47.58948+00	\N	{}	\N	\N	\N	\N	\N
0b70bbcc-85c7-4934-bd79-4c14b575b15b	jhjhj	987666666	fag@g.com	car	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	f	\N	\N	2026-08-18 20:36:01.675033+00	2026-08-18 20:36:05.023593+00	\N	{}	\N	\N	\N	\N	\N
d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	agent	8787554545454	agent@uiui.com	car	authorization_pending	2d9c46e3-168b-4bf0-93eb-bb8664075de4	f	\N	\N	2026-08-18 20:37:05.443762+00	2026-08-18 20:37:07.752736+00	\N	{}	\N	\N	\N	\N	\N
7a8eb954-1485-4683-b4de-641ff66af140	Demno	322332233223	astggg@gmail.com	car	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	f	\N	\N	2026-08-19 16:42:29.231418+00	2026-08-19 16:43:50.274152+00	\N	{}	\N	\N	\N	\N	\N
57654d18-2234-4048-977e-71345c99cd68	test	88899	ch@hm.vom	car	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	f	\N	\N	2026-08-19 16:57:23.13366+00	2026-08-19 16:57:27.512962+00	\N	{}	\N	\N	\N	\N	\N
5a8c400b-e6fe-449b-b850-58d0b05dbda8	n mn	67578587	d@g.vom	flight	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	f	\N	\N	2026-08-19 17:06:30.807884+00	2026-08-19 17:06:36.538423+00	\N	{}	\N	\N	\N	\N	\N
3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	kjkj	89899898998	a@jj.com	flight	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	f	\N	\N	2026-08-19 17:07:28.303253+00	2026-08-19 17:07:30.580078+00	\N	{}	\N	\N	\N	\N	\N
f0d0d12f-5bf9-4006-accf-48685285ce94	assas	989898777	a@g.com	flight	authorization_pending	87a4b8b0-763c-4633-9f59-623d53ecd5a8	t	7590aa2e-16ba-4096-a11f-016ceee5f059	dfdff	2026-08-19 17:12:15.169156+00	2026-08-19 17:12:38.791496+00	\N	{}	\N	\N	\N	\N	\N
\.


--
-- Data for Name: master_field_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.master_field_options (id, field_key, value, display_order, created_by, created_at) FROM stdin;
f5ab621f-25da-4c9b-9a1a-43173ac9a8ae	vehicle_type	economy	0	\N	2026-08-19 18:36:01.583597+00
30344f10-88a6-4c55-8fe4-7e899b754c5f	vehicle_type	compact	1	\N	2026-08-19 18:36:01.583597+00
e212828b-d741-49bf-a51d-c22c1b59cff2	vehicle_type	intermediate	2	\N	2026-08-19 18:36:01.583597+00
34d4edfc-028f-4172-aa39-7e3b6401857e	vehicle_type	standard	3	\N	2026-08-19 18:36:01.583597+00
8fd9e6fd-bf2d-4c7b-a938-881cb8be3b45	vehicle_type	full_size	4	\N	2026-08-19 18:36:01.583597+00
cc35a687-9211-4fa0-9e08-f717e706b100	vehicle_type	standard_suv	5	\N	2026-08-19 18:36:01.583597+00
1da2db11-4282-4b89-a121-d3869a0d8851	vehicle_type	intermediate_suv	6	\N	2026-08-19 18:36:01.583597+00
02406de1-6975-4a5d-9d93-1ae008d97055	vehicle_type	premium_suv	7	\N	2026-08-19 18:36:01.583597+00
0e781623-fec0-4dd8-813a-0145393e0ae2	vehicle_type	full_size_suv	8	\N	2026-08-19 18:36:01.583597+00
fad82fc8-d50b-47ce-9735-f247e94af2da	vehicle_type	luxury	9	\N	2026-08-19 18:36:01.583597+00
445089a3-0036-44d9-afb0-bc9061208588	vehicle_type	passenger_van	10	\N	2026-08-19 18:36:01.583597+00
5e6449c0-ca00-4068-958c-a70bf149f517	vehicle_type	mini_van	11	\N	2026-08-19 18:36:01.583597+00
785710f3-6293-41a0-9201-62ab77dd7266	vehicle_type	fifteen_passenger_van	12	\N	2026-08-19 18:36:01.583597+00
aeb917dd-4dd3-4476-9aa3-23c67dd08150	vehicle_type	mystery_car	13	\N	2026-08-19 18:36:01.583597+00
0f5e01f2-16d3-4254-a382-d56e41b5a9ca	vehicle_type	premium_crossover	14	\N	2026-08-19 18:36:01.583597+00
71d63b1c-f138-4e6c-ba0b-cf9f1ceb7ae8	vehicle_type	premium_elite_crossover	15	\N	2026-08-19 18:36:01.583597+00
7c64568f-4752-4e82-882f-39df065c4921	vehicle_type	pickup_truck	16	\N	2026-08-19 18:36:01.583597+00
c2580f88-45e6-4862-86ea-90ccb11293bc	vehicle_type	electric	17	\N	2026-08-19 18:36:01.583597+00
b342dbe5-b60b-487d-b1f9-d096e57bba4d	transmission	automatic	0	\N	2026-08-19 18:36:01.583597+00
7664f360-0aee-4c82-83a9-643fab4973b6	transmission	manual	1	\N	2026-08-19 18:36:01.583597+00
a07e10a4-8c58-4249-835f-30585e22b2a7	hotel_name	Demo hotel 1	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 18:38:04.515211+00
c1512b54-72d6-4700-9fe2-7f5edd3d8838	hotel_name	Demo hotel 2	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 18:38:19.15554+00
fed1a1bb-8645-4a59-9dc7-8b564dc411bb	car_provider	Toyota	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:18:20.348033+00
8459244b-c9bb-4382-98f3-fe7c009aa01a	car_provider	Lexus	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:18:32.821427+00
afb8f8e0-edc3-4307-b8ee-675419aa404a	car_provider	Honda	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:18:42.692018+00
f9ac7d39-a860-4cbe-8e98-7d6b10de6fa1	car_provider	Nissan	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:18:56.345444+00
7213cdd6-8664-42b6-a850-bde531dcad08	car_provider	Infiniti	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:19:04.880442+00
a96b5a9e-066e-4239-a50a-003a352e1a35	car_provider	Mazda	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:19:19.559054+00
7426403c-9c49-4cce-a0b6-46a70c5d4caa	car_provider	Isuzu	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:19:26.780568+00
dcb5a5c3-81e4-4d68-b6cd-f68389360552	car_provider	Mitsubishi	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:19:48.134749+00
4dad7f13-d519-4450-9e3a-f1c61a460f0d	car_provider	Subaru	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:19:55.239066+00
34692c61-2589-4eef-bf35-2cb80463cff4	car_provider	Suzuki	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:20:01.36092+00
9b1bb3d2-e1f7-426f-83f6-14892a82f08f	car_provider	Volkswagen	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:20:18.063044+00
7b04b8c1-7666-4d2c-9366-12bba9fe126a	car_provider	Smart	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:20:24.007137+00
357c8418-e43e-4a7d-bdc3-99155b07764e	car_provider	Opel	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:20:33.170922+00
3418514a-d8e3-4262-8655-08cac8a66710	car_provider	Porsche	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:20:42.538468+00
60b19f14-a6cd-40fa-8fa4-fa04e62263d4	car_provider	Mercedes-Benz	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:20:50.453933+00
86f29e3c-db8d-4c19-96bf-5101e5630bcb	car_provider	Audi	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:20:58.513228+00
24ab2ec5-22a1-40a8-9e19-fdcbf40187a7	car_provider	BMW	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:01.844018+00
63ee7985-c568-4efd-9859-5be468fc16f0	car_provider	Ford	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:04.696446+00
0ae7f364-3716-43fb-93cc-f115be360aca	car_provider	Lucid	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:23.499198+00
32078250-467a-47a8-8bf3-1dcc90913f06	car_provider	Tesla	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:32.241782+00
d6ef932b-7f6e-41fd-b64c-3c960e09c737	car_provider	Jeep	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:34.850908+00
94c95f7e-c9e4-46c9-a31c-24117582626a	car_provider	GMC	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:43.707533+00
753a9960-5950-4438-8f2d-c5d0710fff78	car_provider	Buick	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:49.077444+00
edb84835-63ed-4d07-adfb-ea11a570df06	car_provider	Chevrolet	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:53.389152+00
6bcaf7e5-2a0e-4017-adad-266700fe93d3	car_provider	Cadillac	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:21:58.497314+00
cbe04ca6-dff8-4335-a909-3f1ee57b460a	car_provider	Chrysler	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:22:03.665265+00
07271dee-d367-42f6-918f-4d256192ce2c	car_provider	Dodge	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:22:10.436798+00
b582fc96-c294-44b1-b15d-e82d2f4ceb51	car_provider	Rivian	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:22:14.96298+00
19d02cda-c596-44ac-84d8-5ba8e7d4ad7f	car_provider	BYD	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:22:25.180684+00
09a2b2cf-2658-485c-be84-bab723f84086	car_provider	TATA	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:22:31.793213+00
9b0f7a4c-67ba-4a1c-bc81-70699eacd767	car_provider	Mahindra	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:22:38.21214+00
2eebbc96-34a9-41d5-baa2-f2d3d270c0ef	car_provider	Hyundai	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:22:56.795769+00
1da00202-ae80-4613-a3f2-e1b344a7eede	car_provider	Kia	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:23:01.06633+00
3d33279f-a770-4c46-9236-2b94fb32594e	car_provider	KG Mobility	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:23:06.606124+00
d34f288d-7fb0-4f08-a6d6-0c87012ae4c2	car_provider	Genesis	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:23:11.075278+00
52c14325-f298-4988-844c-8994a8fed11a	car_provider	VinFast	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:23:46.560417+00
5bd7f5b5-2e8a-4c15-b255-9bb37c173cb0	car_provider	Škoda	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:23:55.909782+00
95ddb45a-b26d-4cbf-892b-70b686774b0b	car_provider	Tatra	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:24:02.077558+00
125fc794-4c5b-4b11-8bc4-5681f3d7f4c6	car_provider	Rimac	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:24:10.141165+00
7e5e5860-bde5-4878-a1b5-4a7edf61cce5	car_provider	Dacia	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:24:18.123971+00
42e8ba0e-717d-4ed6-a3b0-51c7a3bbd6de	car_provider	Mini	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:24:41.184007+00
4ed12569-7800-489f-b006-062233dba1d8	car_provider	Jaguar	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:24:54.620057+00
d9b1e146-4cbf-4220-96b8-53e3ddc3cc0a	car_provider	Bentley	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:25:00.827299+00
017299de-9cca-4616-a203-1dc914e78ab9	car_provider	McLaren	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:25:14.890724+00
56a6996e-5083-4af6-9738-ac2eb7c36d70	car_provider	Lotus	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:25:19.228818+00
8bf44953-31a9-46e7-bf7a-bdde0adb6ccd	car_provider	Land Rover	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:25:25.258614+00
ec78301b-b634-48fe-944d-bac4d139f63f	car_provider	Rolls-Royce	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:25:31.119829+00
8c7472b4-7659-4e95-a642-8698e5dd2744	car_provider	Range Rover	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:25:48.241355+00
a71dc29c-1022-4571-8442-3fad78266fa2	car_provider	NIO	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:26:02.310885+00
6b38dcb3-7369-41e5-b6dc-14620b1913af	car_provider	Ferrari	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:26:13.989774+00
73958e7e-ec71-435e-8465-6d5d37164860	car_provider	Lamborghini	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:26:18.446816+00
4949c819-4e81-44af-b071-7e77cb6fea1d	car_provider	Pagani	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:26:22.552049+00
17b338e0-dbda-41be-899d-5381f84833dc	car_provider	Maserati	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:26:36.447758+00
40d864a7-1385-4f52-86ae-88b136688a74	car_provider	Fiat	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:26:41.653598+00
6bfce432-1c96-486e-b45f-1bfe005b624d	car_provider	Alfa Romeo	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 19:26:46.792883+00
a4990653-2d94-4574-acef-8bea803e0fb6	airline	Air India	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 20:03:12.617313+00
c064562e-2378-49b8-8c70-59a7755a6608	airline	Southwest	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 20:03:32.784567+00
a086be1d-b5d8-47da-b1c8-c150fc4f968a	airline	IndiGo	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 20:03:55.003962+00
1221d959-3e8d-48df-a148-c8ab214db8a8	airline	SpiceJet	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 20:04:11.001588+00
0bb4660b-5730-4f85-9a8b-377d15839a5b	booking_platform	Agoda	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 20:04:33.184039+00
3172ec92-d8a4-4195-bdfa-532d486479a5	booking_platform	MakeMyTrip	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 20:04:39.041074+00
53d3ea82-b00d-4b03-a147-b900976bbe34	cabin_class	Demo 1	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 20:04:57.795885+00
24e48a0f-235d-4b24-b1f5-b92d5bacc13b	room_type	Demo 1	0	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-19 20:05:21.088897+00
\.


--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_attachments (id, message_id, uploaded_by, file_name, content_type, kind, size_bytes, data, created_at) FROM stdin;
1a4578eb-1580-4513-9270-c0fa1a439839	\N	87a4b8b0-763c-4633-9f59-623d53ecd5a8	Basic Python Full-Stack HR Technical Screening.pdf	application/pdf	pdf	67858	\\x255044462d312e340a25d3ebe9e10a312030206f626a0a3c3c2f5469746c652028426173696320507974686f6e2046756c6c2d537461636b20485220546563686e6963616c2053637265656e696e67290a2f50726f64756365722028536b69612f504446206d31353320476f6f676c6520446f63732052656e6465726572293e3e0a656e646f626a0a332030206f626a0a3c3c2f636120310a2f424d202f4e6f726d616c3e3e0a656e646f626a0a352030206f626a0a3c3c2f434120310a2f636120310a2f4c4320300a2f4c4a20300a2f4c5720312e33333333333333370a2f4d4c2031300a2f534120747275650a2f424d202f4e6f726d616c3e3e0a656e646f626a0a362030206f626a0a3c3c2f46696c746572202f466c6174654465636f64650a2f4c656e67746820353135363e3e2073747265616d0a789ced5ddb8e1cb9917defafa81f508871e3051004a85bead97d18606deb078cf105585886d7eb05f6f317c1ccacaacc22ab924c4ad6aca59969759734c120190c0683270ef1e44eeef4064fee14129d7ef9f2f45f4f10347fbafcfecb97273cd93fbffd29ff86a7bffff9e9ed4f7cfaf37f3fd99f47f42774ea4f7fffe3d39f9e7eb39110c8fefde5cb13a418e974fdf5b73fad7e9cbe5e64bffd373ebd7bf7f6e7977fff7872a7f7ef9f3fbee4f63cc989a4da5a4c80099d74b5f9e9e797a7b7ff716e16cfcdbe015209e49c9fdaf7e0f3afaa1ae822384d7e1ad56645ac451792c61445a626e96193c49028b2686793e092aa38f6616f278520249f521831da741e6da0e07c309b323d58263d625d0f1fc07bf5927a7b2ea2d1b910f70e75645016ee6dce934becd234ce1c1ff58f48214922ea1fe6abc5c49771763e041799fda35545c280e2c88f9868b95a561883430cb4d3e2c813381713f6af2ac41851d1859d734d21400c41fbbaee4e809e496270bcb78fc943107f64b62f63ad97c9668e1c6ce84c0d758f8c8e99c1a3c4216bdb5fd4506475c9a59db6cf1e4122eb90d1085796e7457c9265561e9a018700ac847dc3610d8a4fea39e2de061303918bbd4ee60d501261d6bd232dace059830cf132f132e312d5fc4c7ae464440922f910474c75bada4dd825ddbffe2420f8a4fdde5d9c773190ee9c688901d48bebdebc34226190bdbbb63a0fc214c6844897d0ec0d68f029aadfbb6d2b23b043eeedf81b10875175eef9630b574d80c10d0a0e57d121f9404a7bf7140d0a8e3b5d6bdec51435a953dcd9738f0144d9e390b58d9750ed0d782711837fb8babd198488d721837f15c448e090740e161f9bbf57b63d887b4308f01213e9ee58d1fb041c31f5c60f6f405da210587676703e6f99715cbe5833eb4fee4cef12a03d7f7e7afb2a270cc0f64b4e9ffff484972323a805e91a4e9fbf989ea8e0138a0b74fafc87d33be750de9f3effe75302cfc145d371fe1cf3e79f3eb7348002a228cec5424b8e7b242620af014341207fc802d103ab228678565e9ecb9d924a673574a8a609824b4ca3baea0594d8b32f0894972c90214a0a9e2e8afb8e864200c741fc28c52342540ca12490278188a01a02c945f3a947e614c579ba990b8188c2a88f2755a9f239963f77af5d96edc0238ba461962d0a4221782dcdb7b4f5497a0c1883007372c32c18430254fb3bb702755eac647e3d92e8b75dac840a41b538d85d7d2572a03ea5e26a6ded51aaac05893d9a690414a561ebdbcef34993964cbfbe8c6babb2ab4bc9414c21f2b02e25858084a5319a35bcd5dcdf9fa5318bd24ef414830cdb419923a0b3ddb1615be9d25c3c04af310cd35c1134bae2de2fe96a97706e87dd69fe5c210427e8f9fc07443daa4504e1e4eeafb14799efc6e8ef2ab25e32468bca7ea36b0e2584832e619f80c4e9e7a9d3d1397d764ed9ccd739f136e9f3f737937f57baf710d0258eb7addccefa5d490101d516d68d2011dbfa6c09da4632a9a9ea1c7ebc6ee0777ffbfd5fdfbd7bfbe1977ffccfeffff2f98ffffb8fd3bbd74fafafe4dcf3fbd3fbf7271bb0c75a2005c0907cbcd3a19f5f7677ca9dde58ca46f2616492f2cc161799ef9c07dd2682ce9bfb5ec9aa96edcde3b56da171e0358146cd53b895242fa520f3e1348ed12b685d2f699214cf137954a71821d1641d5b49b698cc2a6d2ee5c3f47db65c37fd97c712edcf9a5ab47b0c8c0354c718c033452c0ce7eb659165d5cd0fc8f4bd2db6dbd3e0dd96480324c2d22035ea6cb107fb80e95612bd344af2107180555240b0ffbb348ccff330a652ec76572a3b85a48c7c583f46079caf246f2dd4cdd3ba58e2eb3982db2d5d7dcd885af5f4082ec4528fcdfcccd74bfb76c416d9052ef5be513f710ea8bcf006786f51078e47d8a3a88004afbe608f69d64ddb2406bb482c5a50ab6e2180a6a2df95d93b5ae8219fe63d1d9be75b39828b9a8eebea4e6fd443be61c673043feb95d7f3bc5e6c3c795e4bb3ce6607b76985bbad250fd31eb96db3d5a93b073a2fa31bf56d3332b55f660f1ffa3721d5e9dcc3c735f60e2c6034a3d88a5a823b6933588c09c43b3382a3ca2586549e98ecd8798e995fe751f5f3e7cbc866473039af4683a0489646b3657cb00f1403cc21ca5612c9e4bce8a54b4726059d9cd6411d9912a4c96915c7d9165698c7d395c7b8517741ced1e4711b118c8bebbeb1df0e67cbb4841347f5620fc1f13d4f9037d5c503cc3f3786f792d2203b5527353b5d1c6d8e3fe77586e8dc735bd8afe26b5676f794bec14cf59fd31748454d5b4b87de3fa83f3bc70f0d6a2d86f8ec5fdb4fe41b510154a57816cea6b4c43ef3def878ef5e8b0f920d9606686aa9671350d0f4bc6b9b417d6a136b10c101da21122499c2fb1bf5ce41dab084c6a6715e628dbe7cc68d91de84c37318fcf8c8736b5db3c36a8fddd6a298c0cdc9a39b4073d9a3737039fb9370b5a7346a8d0e0d3dd217b96f45e9e44b4b67a001eb0b75c0d0a206835e16a7c902f71cef98921f1ae5263127db9724d88a4a4042a52cc172449b66bbd13e0dd249c917c4363b5276c0e38e921be1d1756788b692a49a22da9509dc884b7e9062ec5c55316915959620f6b056c84b7cf1f59281eb26c545b09f06ac1a41026f614e6b3eb0b19910f38f5d27f48da848907cd1a02e1ebe4da4ba341d6c8f6ba72839f08a5fc799abafe61d9b35f5ba9c148a6999c6195643da0fd02a8629482acf6ed6ecb55d3b8f11d052abc7352ca488a6536ae376c5307ddf7182da480a10622a6665e4fa8a6f5ece93d3691cbe0832e7f28f6a1b08ca699ff3d2680d211c0155fadf1e8b79089569390711714fbefc36face7bc4081d0541e69cf48d8ef3556ede74fc254d92e7fd756fae7fb37fa300f79ef5b7a2e212eddd68de94eddf8855cee699066868975665f39ce3b3c7b760dbf38d038e3968694a3f10da09835246e1dae7ce920ed337f55cc35237b1e83643bbc34a4543a782841431705a720e0c19bacab76eb158e78410ce250fcacca7ebaf961db9f9302bad8bd2060f036fd0379fc2e9cb9327b7fae42f4fbf7b5c60b53f27b342cdc641a859fd5742cd5650425205443df7c05f03888b9186012c030111a3e877094b6d9c50f25614a103b19aec204589181fa1abae3bbb42513993b93a83dd76d64de32c202ce2f93168ae8e13dd85ecbad6e953174e14217a56198634440f3e84f83de2440548b9e824fabaaac98a55f59f07138d016ca58e9bbc8410ed00df0468de63a81c356c2df56b234b25d8715f07e2330924716a437bdf879c4e2e87118f6d261c19d8c5617b09c70848c55a8fe71efca838b53d7f5cf188a0b32ddf0e193702295427e36365676f2d3ff8d0b607769560884f90523e880e1ab320109d272c8dd9e46ad1814609e8aff6fbd7c631ab4649d7ab3ef1b1c1514270342e3c505230968a923d3df06f8d0d095aea7e98dee2c1a92f96a0dc99d3d6b9ab7a2b92abc0d28778b18f75c8c957133e03190bc27a5c8b559132195d4423347d4d1fd17fe7bd1475ffc0a6ff4ab1e98dc0da94f19623b0d52835c0e50160ad44b03550ba626dc5ab307005cc68b8b5e50e7f0133360219d1c99c7e3a3a8ace6a99a90cac9df1345342b34d2c0788d6ffe3a06e83d750198b4da6d8c7cde5133503d0310590de9bdb3598ce21144db2157eee3c30b9be5b88b524745667e5c7e2a6c9ca512708e551fd242d10cae21d72a35e96951d524d924b09a664f6209c34450bba4660cd29dae8c7af889366514843e697d5d5f02ffbf1d26d2e5c68d0388bf8ea38efbe40bec5caf7de1fdf60e57df9fa7820905b996adea3793b0c4058b4a82dcc18a91bdaeddd0194d0437c7f23a4bb03829a0468ba5b69bc035a118c7547e3e48e2250b9084ddc039e5a82b93a78f221a3597fbf17e29f9ab20f7abd2f0eae84c1ed68d172147c83146d8a822b41f031e5ae62e01b4070570c5c0e810f8ee055045cd2727f045c0b808fcef039febdc17ba7798ae782ec8b276d6a20a51977774c5172bca0ee6ec67117ee651db79ec1f807b5a2090551827a570390a6064258a284839a469cd65dc1adea5485cfdef0d32d429964296439a69dd5e054d0f7371bf8ae8d6f253cd052f9d7e6ff575492fdfe9f8ef9ff7d7517c3aa2ebe6acdc5b08a8baf526f31a4dae29f586b31b2d262589dc5b02a8b6f566331acc2e2ebd6570ca8aed85d5bb10b89bb46836aad0ca251ad90a07e4ade0fc45dc712a93bbf095b4ce204aa2bd57a34c6241420d8bde961ad98004391f16201614e0990b6954bfdc8e5b5200f73f17631edd164f614932187faf2c0ebea10a9256927f3ba0e85db1c5534b2d7e3b3ca6c1512e5595de0b54d33ca9a6a74268d9a79aeb099e42deeaad82487c3aba359d3c19127f8f761852d87572182d89d785bc9f3a99f87649d76931a0d493f847e75642681d0cb3cb316946a669d4fb5bbabdcd6a520dc9f5b5d0b3a1f9aaa3578bbe0f32ba1296476b1c3da952a379a2e4bd6b974e31e2f16da37ae620ba22b6c13bbae4ad6865c15d6389346bb37e5396eb45a5f945cca4fea00e8bb87083678dd83812cb1b11bda2526c924f47b01f2c4df06202f6cd16b603d029027506164f40b3efef241051ebf7e19a00f1e4fa348a5fdbf123cfe574b2a5d859dd6309a23d98793074623e21c35a90e01495391d7ba06599b81ee8d2da18241b864189216c928dbd01747a36a5fdcf67915b8d85cde71dfe00b2512357b6a64eeee623b37447f7245f2e26e407f2057448d7e0780fea445cc6637a01f5d2ad62e7c4344bfe4fb8771807edbe20b735729e9aad1415797cdeb484e6562f0ea781c909d228897404388af5bf7890f3d1afb0431a6717cd839052e2593aa4374f795855df3508f7aada00b036ca7768a5662d288015ebfeed47ffbf2839ffa57ce4ffd1d628007606c8df6a2c21fd24a4ded72a6bd9e196c92168d5070a23138a857a22ad1f594676b9b0cab2a1a429a8c2853a2bd9266333ec74c423f133e9e339736d93949d3d4dc1570e130fe3756d383bbd1636d2d4601a379396e0c96a9afe4f6ce09c3658c1bd9aa2d316e9781c7d1a46c115e11df57a6c69ad084659c783baa34679c86a04acb9778799cf325469bc4208350cf12520df57c002d6e544795596b459162f582a113956db8d431885cab4dab20722f29ed3689766d539e8d0168d62a52bc992cd72f40bc8314affe02c41b4c458c2e809f6f5c8f723e2355b8b807d2e6e6bbf9e926e3a8ba76393fc130f6d0e6b6d250a3d5d08fa023ce30bdf22d4927d69e242ebcf44775d3333aadc8f9beece00bda61be866edd25cdb74d17dc87e9b269aa422a5e13cd0cf4d98f5f530d6e10ec1de8757161b9af6ebaa0593f5fdb7f8ef443d0ebd7d78f8d5ccae2ce98a7a31cc022b9c0aa8498cb70d585a72b43a7da44dbb3d7334ee1a896f69863111eb85c869f492c97a877f687adf501a872e65b3b4caf9cdf0c2e9f89c900b6ea1cbb3dbe7053c3e0dc033cdf7e49323dd3507e8b2b2b388964b7a0cceb84000fdae2345dcb0e505b64611bbdb107bdf2e39ffa094d8dd9b502866f27899d0f999517c47656fab48e37475d5042877b901c20667f5b2cfe5868585fafbcdad28b0ee24ef1928dad0b4abe15956ad3f835c75ed52d9898a33d2864c2b26fbbf27559cb97791e5a6948539900ba9944f38299a83def74a67d5c9eca6b2abddcb8563f55f98d201cc6804be45a42e3e6b3fed54384a676b3ef23dffffcd3d68d62958e6057c6aac39358698761b54710e2a71cb914ccc44a4eb279d809ac91d19b7d5c1e693cac61a8e690bea6c7107b5abe3775b1151520557217f30336d3c3258d62233f060c9682ee1c05195bd9b1a07b4b24faa374e647e9cc8fd219fd513af3a374e647e9cc372d9d1903c0cf2feb0d283c8a46ac560cceda61f7f93d93de4b8ab520ad3d3a71b0888663ff15d41a2dcfd51ba8be229ae0fa2f9fd682a476f7349da697d3768b50311c6ad99c1b0b539ce61b8ef4e071998fd74fb83735a05cab0a6bd454ab6fb07616f7c441253312eb25335759e1ec539aaabdd510bbbd177937d54195f7c497196eaeb554c5da93c08ddaa9bd8055f6cded85503ef6a64056628261d4ca7e78f7430d2b815117eedca6f39677046929f4d85d8512bf4d158ab7bf4e3af3077557a1d8056de24b11cafc73a506c5b84745d9e3911a9434a80665f2383f6a50beef1a941a84b807ea1f02380ec502902ec5ed2e4c3184a2e2f729b207d6ae7456c3d863298e7c69165724c5d7af5f549fc55851145f97767491552347f051b808c2eeebaed83340d11711cf0f60ea8d2da98714558b6f02f4e9ee11424ab108c96f86de571fdc682e0b8abdcf670472639fcf8865df51af378a6d2f85dc19b4daf877c1f2c96ad68543332cdf5bc5b188d763995d7e4406b8459895aeaacfe7f1f399a30f8aed7361771f99da1a8a8dcb8d44f1e271a66efc7f02cb6fc7709340eca6eb584b4acbb38575becf3634a4021a487b001769ca90e9221fc6f5fb77330f692b76cfc9287cbe315cd500fa99bea61dc78ccc55beef56ed8ce2b002f86fe34a6d440a128cb1833bd7bffbc881364be78cc638cc892d50be35dd5e2167b8291686b715a09ffa893336c4d152bbf13dc0263f5dfe8e2093678bfa558a2c424b022f537db5011f116def3d8cbe475f6370d23232917521dfd84fa9b16e527d3ff9d15a927735f623ea83e65b5eaf22b155b7986a4bf31e50b1110cad3a3bfee31b944e7ebf94486b83e41acf4e85ffac55a760af9b15ddaee111af574f2361bb259f4614af948a1c667aabf356b38085dae1e41acf21e8d132075e5ce48dba6762c426813182798d3e2e9f75412003cfe1df0d0192ef1e3aa40833d9e9d16a0626d039b6ba2d1378df24ca5e471ea29328c44ad9ca7231a436a91906b8f7726df340498201b39beb1ca7fda5ef61f2dbda8fc9dd8da8fd285b5de3a412ef784379a72459dcdd5652b9d2b04dba6d6dd365da513dad6a73ba4ddb5fe1d518d24dc7a5e3bab26d90538569edcdf4b3b39eab535a0331675406236c529072c141d1269be75bd8c1180f2d2c0b2f7abd46ae3970eb7e717e23a95ab5d6fb5e4a323a9e4e96ba8d245f7b9cfe7c7bbf54b7be743d1da612200da9df52a5e9eaf351b559478d96267ebc427e93b34fff079cd5ef3e0a656e6473747265616d0a656e646f626a0a382030206f626a0a3c3c2f46696c746572202f466c6174654465636f64650a2f4c656e67746820353439323e3e2073747265616d0a789ced5de98e243772fedf4f512f3021c6c50310044cb734b27f08b077e70516da03305686bd5e037e7c2398995595596457f218adb4d048d347d55464f00a0623bef888177771970f78719790e8f2e34f2ffffd0241f3abdbf71f7f7ac18bfdf7bbeff337bcfced2f2f5f7dcf97bffccf8bbd1fd15fd0a9bffced4f2f7f7ef9f7838440f6ff8f3fbd408a912ef75f7ff7fdeed7e5eb4df657ff76f9faebaf7e78fbd76f2feef2cd37afdfbee5c779920b11f8fca7facc1820fae8b5efd1ee021814d9517e1cc7e571b1fa38640714597dea7ade773fbcbd7cf52f7c6d2f5edbfb01384497486469b8d455900012c4bb3e15ec519e2922e9d3277901efd5cb40636f634bd7b6828846e7425c14f0cfc6182383b270ef107b72895d0a27a714a604e2286977ff2a070a84fe64fb082350408f33ba99efa79427144ccb94627936b94918501cf9ee86630c0e319c5d4d14109c8b694ac3e5aee10e3146547467c79ca2871882f6361dd033490c8e4f369d2901259238c58ee8fda0c794026fb3bdbeba593c48e44ecb79e87c7fa78017f149d69e783efbd92bb01286ee59273ea9e78827c79a2302918bbdf6e403501261d674b285e21cb89846c6fad6d3e1aea711133be6c82717b89040d288dd96d4a946f291e4e42c171f80033b9d32cbe35dd3c5e6b8c6a7bba54401f5d2bd598246240cf27439a94308aa9d7d7b18e474db2b99bca4207872ae2939f0c42176b7d7a1a7e0e9e46252f62089ba37e70fe0d56b503ddb3e55608f6eca5ac29bbff90124a288329e5c4b1a1d10a520dd0d67e719d5a5b33d9d3cb814b9dfed43468c62dbedb9d5eb39822233cef1756fce2e788989747300eb8bcaab4270c23a65b4ef3c504e424e5747e5f9acf3414043b7d9549f6cbb909323ed930311f4030e688cd1073cbb41ad0737a778b97db1c7ec5fa9f7ece674be7e7ef9ea935cd05f3efff9056f674e5062e1a097cf3f997e282071f9fd8f97af9d63ef9cbc39a7ce3965e7e4937312bfb97cfe8f97ef3e9f122a1192f3a48fb21db7c851065654cf8f82e8d539d61661c1831dd3388e6a155dad75768e52744e82f59873aacea9774eed77b97bef6dfdf9a373f8edfdb37fff5f7ff8cfafbffeeae38f7fffdf3ffcf5f39ffeefef97af3f7df7e91339f7facde59b6f2e36ac4f15c4e821f862b76d2dfde1ed6c6bdde5032b78c90662edfbb4368d9666e4e65d9bded2955ec07172a6e9f1216d63e2e3d6ce0741b9e36d4a7f67df5b84a243e048e6a10daa874ec104d9a4394842fed82489b026a95527f24081c516c4c308ebd26fb2f65bdfe8628ca036bcc3aa2682148b9a9a81dae662d636ae4beefa73cb83c8ebb6b6c734a6e016d3353ade76142e0b6ad5283908c9c72f36daac0c33ba8e3580ba10b130d8dba0ae76b46d70ede0478ec757b338319f49a4a0a1de4d41be3391abe6884d0f0a0209e5fd05548a99a142b89ef4ec0d670ec4f243dd6fd862369b6aabd71d761a9a0f031252c4c069f32018282ca6e48c76e4ede88a6109ef28335feebf9aabf3f062d65a37ade5f281c005561ffce5a7174feefe85bfbefcfe44b4f8bc7fb5f39bf5d04901d8fec8c330fae054c3d6430ade4632d0da43b83854093c07174dcff5f5870972e201b6cb2b8a73b1f0a4c7b97d466202f21a301404d26b168864c7914872535ea4dc284df9753be2483611d70fc40edd3441c01002cf6aac175026175341a0be555457aab4b5a74989408263a2594d4a01288ae7d2f8e9c7daf855dbb438da0a213871781bbeefde1fd707418f3bca99b9a81608179c37b93558e04d926fea1d59a60243946421996bef2c8d1288288c1a6f1f78ed512e46305b3a712933680c2579eb703c0e536d1d575b5af98068e303fc9909e55378fe09a28ebea2c88031c569eb906204e704b520707504d11c3c4577dfdad74ab7ddcfc074ff816abff54c41660f2881a64d411607c9db8429acb79acdc14a1ff4d857f60962a0386dcbe020e063c092c0d79e99c789c0a1929fa661f2102969695363b7cc3c0161118977b6acb6ddf132c3104135044e7c7b6759cbc8202172627f5b829fca43e83e75b4473481a0fa694b53bc58c838950432d75a5b9daeb515b8b399cedd4de48f27365bf4fc7453dd0d8d0f77a3f9330d8d7a06619db7415bcc2982470a898b53d6f309a7a566406afd5e9143a1e61090decf1292b15e8c98b1333e3e36beab13a3071f2999cd3bcaabcda4fafe5e9bddeb71e5f1135ddb2f9200498a12deeb83e7d898fed0f99639af9dcee549ec9cececffbac6cde31252d9c2a3cfc3293be9de43c0de78f54e524030c35908586f41e91caef8780b5a4f0a4aefb4400a806b04aa2f2c7decfc634ce4959de36503433bd25990f4663c97563e2ecd779fc20ab114546e1c0171c095d013bdb549921cdaef0bb3ed2525a0757e3d84cc5fd7a991ce647e765223f70750f782e235f7f31064fbb806d6f416af6c5c5cc8091295c3a18d8aa20814130f7941bdadebffb54d66a01ce5ef0a551e24851ce52fc42a798b4f6e36eae32d7e69394016f313cec42c774f241fa7ac190abc2c9ae13543216cf9b0519d22e545538afcae06a6633232fa498b86096bd9826526364a4bfdb987bd24e65af2c166deea7a9d9626c1909113c6931541a361018ab98645b76d55b4498e61db7447754c08de95c7d46c34df65e9dfd6248ebdbee5997306a26d67f011b0fcc4d63d2610a814c75db69c78fede24551ddbe17bbc6bd54540435f57baf6540e6c2f916592e1564e35c39d9dca2db184e38e2632541c81469ddde5837ac86072ec373bf1514aeba647066acffedf83a8815d591cc4350d3da8a0282c3f3faa97d56a36373e643b3641b540e0ca3d97fd856bcf7559968c5e2837bc79883d505ca0230f73ae9acf3667c6b9d7367383c983aaf8f49ed24f0b09facfa41bc6b8a6ac4526de07741990eb6defd43d3f07edc56a80b07677fb69742fca13acbf3c6a7ad2256dd5de52489197f531aa3e6a84158053ece8d53067d5c9c2470bc0a25565625edce8517d89e3e6473fe8bbf936db62c948bf0e5d638249938392c082ce7c0c56c47552f8336792bd582607c5216bd58fc9b0a7c5decc2ec3294ff1205202f86458e771ed9436cfb8a45d1edfc6b165730617b0cbb076e60da6e2c2bf626536e89679b27a167bba7f8c30c27ab41fd558582108612a689ceefad4b40d8da27ddc4044c35a060657eed75a80ef3972ea60fe99c0079cd1a7ca01100d0efda8ed06245da3a78f78d9c69d061156af6854eb42b8f19cff73d83c423e07f79d5d0e96928084b076a63ee7441e26d2b59386b533087825be763da1de8deeee34683bd0c7f6398a16ae98a13bdad65b09d7ca21c09f0dfedbdd743d0df43b8c26fae758d9a7459bfd4e661cab196887e3d372e8ecf370f6d1bdec9d974c53de49b6934a5c6d7513a83508d8663f5eca1052de454ba6c8b4ca1ad21551751a561e615833448264a7e592d36048ffd549fc12850aec57c8f017a953e0ab19bc021b4e639017276f0254d8501dc530e0f8e4b410a3e56387b5cc11c6652d3ed8bbef5607c2b46cac548890d6829b41f83f332c69e7728ee5f52ef2f934a2b3df8d0596c53da8608810b40859df87396fb1892555d064e74436ef79b01240d25275f39ee3d0ba6228a4ed543ca85d6408e44bc1e7b614cb3ec312a1e22b35162710c152cb371031de1ffe12f4a609f6164b60894c55d7888580302fe3bb413e755edd1f895c36d5c35d292cd9454c33a7a178055cce2983daf9047e39a5cc9b86eae6d81bcb5bd4eccd1aa06d2b3451c2e7a53125f2061408e22957ac9eae33d9eae9bf709d099382bb920df49799441549745766b2be502933d97389f45599d0560a3f5a65927eb555267b74348607587d2b6abdbdc8c425a6993526c49e4bf8de6a6181ef785008e038c8341cb1c112154328d64a3ca97c9803deb6e2d9644448d30603d141503123576854a5d8a5860f5d03aa0fa3d7d7564e998e01715a5b2da8e3998ac8f26a9b52cf93345ab5a2a7304d776fbe604c5282d93f8206ce48345091f76e5a2180b9fe181dcb3f43794d5bd3ed1c2111695a5f920a5052d5673632843b23d9b39591b77426c9b4554639b5e103ce9aa81969c6395c34a910298013f3185b2ade6a657cda53908211227b9c66c59918bc3a2909acae006e7bbd6adc2b5b76bd10ebcc9adf9587d46abd5aeb1dba90f8821e90c3fb96fc298d5d77389a3676a2b3b0a3df70f8bf301c3e35626cc6b18664344d4b187b6e106e0f4e33d851e7117e27c8e8382cccc567a0a7679261077cbb6da5534092c831e7c0c7128d87d17699cf6586765e416a89c6d3f0d8b309c7fd84d32a2b4debd4d5901b919e4fdd56307ee29c8098007d4f21f36749850f2acfd566b07a456233ecbd4adbb3e56b731fee08cdda6b81929b84ede5a4356cef7d7071a30f6bd453386e20cb51f8b6f002b27cc2bb64b6ea0e83dca1b3ba340972aec835c8f9d59e1ee8d95a75f5bca177bf005e3aeee769d679c517b462825738c42820f806862882bb719f2636e58b06b6ad93d14ce20a651b850afb050554845bb79b2d0cde42c066b646158b6ead522cc2c03764e6953f6a45691e7bd6de6bdd160266f0d0bb90e6939274adc578808bf7f906ec186c45e1b06aec42066f3421c4db9e60d8c805b939aa6b205853f90f5361f500b3bea748cff6361c8de13473888d162d60d8ea441efab3af5ac6f697e89e20eb4f4a8a505c471b9af0802f6bec44756a6cfae3c6d4f6b97cdfc33b951f6fedeaf156ee3cac1f4748562b5918e3074fb4b99242c31527de5449b1a76cef8f2a6c94c3a7219f73a8711f9191bde4b84724ed203dee5edc1041ee5ed42f9222f700f21c25c97d8a0fa6a1a8c301c91c8dd7bd13d770186682328a885ce320537f28e420c9d76321cd60952396d701bbf279a01d172c6690be6019ee11138c79531b468ae7186e7653c6aa700f62c5e7a2aaaef3fb4194626d2e9ddb0e0fe23c4dd3cc879a66a530dd5262d8f6082bff5fbdc826f08da89144f8e57289b3e01be29f077c233e9336aeacf9dde01b4c1403e20d7cb3bd5001dfecaf38e904dfc824f04d8568ea37f0cd2f0a7c932a49f7561c482dff56cfeac746e2b22ef254322e87e8d23cc403132422c3d5b520826aa9e427cc95e7bbb9119e53fdf795555bcdf8d646b107bc4546514d765dd8acb43f2b38bbc3a034f35b7174f72cce7207c1e8438f58c403eddaae69100c4ba2d87d9aff28166776761b922f92bdf6211cd019b8a8c8053cc8e2bc2396fc59689cd97b70163798c7c1ea20aae4bae9c92cce8c3846a12b0ec1fb54d4ad8fadd4656085975984b3420c11f109c4a34960044fdeb551c6f3caaee940a304f4b71da34e523b9757363af0e8645e3f44cb4817d72cf96a37ece8755d0c278877fbb85a498d66741ef24dd919cfa82fb6f7db5634546afc40bd77aa8ec5bd19e4a8e104e2aa061abb331914c6c6c51bd03d51717d4fe3d0d566a05f0d787a8aedf8deffeb9bac16f6754bec660625ae0ac46427f547792b5ee991cbb79946383622096b4b416f3de948d3584fa215c085649701cfe94a24064a2ca5b1f9c5d20b7b07d13b4327b6d10bef6f13edcf3f1cef8ef90dd5f8f9d7c52edc483c9af24d1e53606e02b424202772f55a266a0e8f66ce4495b30a33c87a9d545216adbde852f542bf11b65e0e5776b1e171ae2655724a2f2c2463e738d00e2c766e12721593d42ab4c938dad6bf8dfa11db055e45badf56480a7ba83047d3b7778b45d67caebfb1b8e42c4e6847069acba673087c5d0d07d789b130447e857ab7832c77050d3d306ddc6354d6b4482324890d5f3a054d6b67ef4a61792bd9baf3bd8c4207e48c21478b737b80365a446bf3bc193d933255879c19d936c9096b95eacd74f5be56a2de41216d389c0a4ab4036f9a52715558c23fe362dfceb2bbec25cb42163641475db8c2dea55a689318161f6b826e61610a7b42b4d008d2f4e8c02d9cad5f88d3f8fede635b231b1d607b498947e0955b6f10bde515961d7e123e2fd17213eb38063779b00c7751b72a9b759b5762d5182b446614976bd8e3225cb883cd3a17a8ccc061a3dd6166ceeb544e6b4c71e35b1d45023b8250997e73e0b6e4792b9b18d5d5ea7fcb804e32b7301ff536647533cc910db753ee89f7c30c6af92374a330473f0a73ec410f0ef1f9217d5146bf03006e84d3ef206a16abdf0168d6cbeb7710f3f332fb1dc17263dc7e4fe195e7eb0b1e675737b7df910cbacaeef79ce4b4754a608d03af795a38354a976ae9e9e8fa429dd0b5790fae95f3f6e04083d65ce066d542aa5c3f7245f976c0c2c9a5ee20d711ee294b94abf7a474e4190eb5704f3b153dd5d8d9ae98effb02a78d467f3d432d93b371895a1150b9d4b279b5a35dfe541ef8ad4a3bdc68b61727a7f11181f2a57f33b40dd50b887640f48c556e132d76bb5e996bb099261a633e18945679ba5598ee4e5ba71cc723437ad88aa0c689ada9765bcef5fe9dcd88aebca99b2b6073f9ca15dd4ac01eb0d651cd6523c152cd9979be3fc678284f705706fa51ed6a35b11be7f6a7d5cc66fbd0d8707775fcdacf0f07517a75fc8a87b12d29d3d88f315e1db6510d138371bcd68a4bcfd36b1e49d67929609ba0a26153ede3b588c5b59e3cde5f5fd1a1732498a5b295aa948fa07d89aec25d2dcb8d7ba39a92d0163d7c3f5cd0c1556f35bfcfca5e0be75b4f0cc907274d050be1e72958f0c698126525d2ef2e58e0902c48732b58d85ea8142c788e86c6611c295888930a165e7fb5050bf4da8c86fdd8057683c44ea6017cd5a8752478dfc01e5805aecf04a2276f7746b9380d8e66e75764e194fe713ca2a44044314e1b3e2b2e741ca88869fe672f2c490c9eb038753b977704612dd63ed4f186b53edb81873d9f7aa7b5dbbe0807e00e7ade578580209174dad265e7339798ccc7d9ef080f7b70f69c2f93c2388f54520c3c50aee178562230c74ce53a09b4cac999751214534920730d775e2f9969ed852776adb5ca4020043fb1b08212687245e0752bbf6e7de5b756d83c31d573483eed3a8220f884afb9e4b4aa4270c2ad55b647d7fe7811c06f78d85f191eb697e389ae17298f62d2428d8a6d2c7c78042f1896640210079d834ab228ebe9d6bf9b9e47228976e622b2bbd2976b2687f955632dc637803fc860cd297d4be26a40ac4e9053c61be4f8c1b06e3e800f4590d3845bb51943668719073b192567e51eb0498c69916a4ca7adaa46bfdc8f5c1becebe2b7385c8ec936c917c1ed2add6174a5e6cbd94bcca907b0492bd3675cb919c7758cd1822bc594f08ac26b8fc23e308bcdc177abd869e35d5dcf5f18bb971cddc609351f3578c5efdb5f5eaee23abeb696339ede985687720247a6bbc1776a04846abbd096d8bca37a6d047aa337c0e7149c5ebecc23dfd135897c929c5beddf30184eb71cfc1703c3e962ff86093cdd763dfcc3c06fd8db15c3d2e87a305eb9a747d9316d835bf0e9efb312b64995087ea9b518d54f19568eb167a3ddcc398d1b03f3a88e49614986d411b89bfbb9bacc1d567eb9d57c8645ca979a976976cfe57e0ffb9b6ed72b8fea15d3c6fafe60e1bf5dab9fc8396ed34fed7ef505ad31cce0692cadc5595da369ee61f24c572ccc7b29403b62fe3fcf12881a0a656e6473747265616d0a656e646f626a0a31302030206f626a0a3c3c2f46696c746572202f466c6174654465636f64650a2f4c656e67746820353430373e3e2073747265616d0a789ced5ddb8e1c39727defafa81f1015575e004180ba258dfd3080bdab1f588c7717305686bd5e03fe7c239897aaac24ab92498ec636762eddad6a2832920c068311270ef10217b8bcc30b5c42a2cb2fdf5ffee3c505cd9f2edf7ff9fe8217fbf7773fe56f78f9eb9f5fdeffc4973fffe78bfd3ea2bf20a8bffcf58f2f7f7af9e73b0981ecbf5fbebfb814235d6ebffeeea7cd1fa7af57d9efffe9f2e1c3fb9fdffef1f3052e1f3fbe7e7ecb8ff324178ecedb3fb1facc945cf4d1ebb9477ff9f9edf6f1b83ede615064a0835a2005173830e80835e8aa062b9007c1a37a0470a8441da3f10fbceac1ab1eef1c01254fc4591192ba06313816263f6220e44601d1e023519c14f0d348d46d91c03b424c784a8ffcc6915409d2f4407afa40220711349c7e204210c218f4e81339b824e9e464c3c5810f0122b33f3aa6ea5dc410c388b9d5ab919350e4a8d37bb33c33728ae8ce2f79b838c190fc32cecf17159338041419b2a8fc8d4d232b2927f0cf56150b3a4a2471c4c8871b0d38a61438858316c01e1c7a443ebfaa50a2f062e3cf1f1892034a218d78f178f3e2c02920abf041a3136017533c6904b6a1b00a7a1f8e6e29c2e8820f30e4cdd3cd8e82a0e2633ce8644482f3ace1f47b4b54733347dda878760ac2e75e1b2ece7b8810f8e88ea9a02e61121eb2b8f11ac0983bd7289e9f6e994aec1081cfc50ed98f48b665a2a78f12700c48433c385ec3a5774e00a3aa1c7524aac9a14f53287ace91900fa4140eda950675c0b1637b06454d0a8a479f98c0250874d6573a245656547ff0811ebc0b41e3b94dc2f6e114bd573e3a879ed47911e521c67413f44ae090747e6f85674bd87b728a8c433647bc06bdce4b4ca4e1a8abf4213a8e18cfbaca774e2151082c077dd77cde3293bc7eb1c76c3fa9bfeb125fbf7e7b79ff552ee82fdffef482d7a3a253e2bc597ffb6efaa1b879f3fef62f970f00ec01e40d4001401940be0248fc78f9f6af2f5fbe1d122ad125f0a47bd9c02d72945d5e29bc1744af00ac2dc28277e22171ecd52a42eded3402280248b011035005500fa0f667b9f9dddbfcf32700fcdcf26c8cde055f1c91eb4b3c3d4f9f372ded342d9d06c60643e6814102a0340f164d0393076c1dcca601427014b1dff610c5052a0e35f2a726490c3549ad3ab13a0cf92cb95f1002c00c406f4d123db8346455a05727c565d13a5c112b825a358aea62de68f776c800fa36dbd9eb62772dc289d5792fe07bb5240187e50920bdae14f97276453090b31f3bf564f02e1230f6ce2f135504b56a44c15596152d0e77fe2ef3489a336edbca38a90b1ae2436d9fa70ecf7b5cdfe771afdb4e93517ae79332767b2c468795c5bcacbdb6f9b0902052ecd74c83333945cde65d2a6fdd7cb32b355b0f125bb82903dc2b4507a9b88ef3466a2ac2a27693e0a06e4a4ff66a1852cd23cac691351922728edaa4dbcd62a8466dc1c6afcdf9a3ebdf9ff21662ab6cd4da200dae6c228d8a799a165961261f066a00d8b48932a99b12a58dce55d579d0341dfbed17603e75faa1ee4a970ce9a2da9c1d0c1b0ded8ce624a48881d3e254d9e5031cc743da7975896c00b3eb5766bedc7e35efbffb306bad8bd666ee392f6903f2fdc513dc7ef09797df3faf121ddf713699ae783746c1b1fd23bb59f40154c3324066c92810681e209ca2d0e43c0788a6e6fcf9ce3e0e3cc06c43510062e1497bd33e223159e410301404d26b168839fb1049aeca8b945f4a53fedc0ef6d35eb7fe857842374d2e60088147bdac17a74c105341a0be55549f1de2fe5dcfbc522227019868d42ba5e0c892b0a5f9d34fb5f9abbed3944750170208e075fabe3c9ed79da07d9075c416951d8ae038e3b66d40a324df343a329902bb282978ba8ecef452e2220aa3c6eb5f783da35c8cce5ce9c0a5cc4e6328c9a3f95dd949881c229f7f57a4ca2f063ea3ee78f4c6de10e02a4bb46c8844274692a23844c261ab94627489bc9404ce6746f48e5591f966d5bd561657cdfb9e59744cc9710018e66499c561142e099cddc25ef333b3c4ca4e34ea30c5353a0a14f937db1d38664c478e02c7bc52420756812fbd52c575cf87a6417bb86074c9b31fb69484d8856018af82793d76348d0f62722204e334e7e0483d17354f37ae10a071a746cf7d0e4f7c7088faf8559f82a1cea77696f27deda8244f723b6407afd7b9486359f5a5d4108fe47b36d2bd77a192857c7e76dc480ae8508be7ec251595d32a9fae15926d05e4f7fffe877ffbf0e1fda75ffef65f7ff8cbb73ffef7df2e1fbe7ef9fa95005e3f5e3e7ebcd8803dd7c2d26f190ef4e0857e7e3bfc527079678775c965c349ca2b03f0b4f2d0026cdcf88ce92d9f9f86374f6175390f73ffa8c619303080e557792f69d9756dc53df4718f8d451ce4f7edd5d447277335eb5e522ea51dcab76d242671341dd47b754bd1cd95967b4164b69b8b074d02110d1b21507adb46dd725a71ce06de8bca191acbce689b48a1a56ed6ab9cf8b5dcb59bd5b42d8ce6613c547bd93e2245c7203e752b4b40ae388a7e9be35a725e560b6f5cd5a46b82b557595d33ac3b9b7c6b93e40dfb98dd7daf4e3e3ad5e2549c5cc29464aafaf7eb96a29bf780ddfcb6af5f2b8055a435eac588068ec5d2981dca456fa591388d6a29f25ebd28d51cfb6d8d21d7194e8c5f84517a467da6e782c080af6d5ba76182030e9863a1e83c86d21c671d6f801053c8d6263db08321632921ccc1cb5e4ff3794be1d4f2fb7e294a4cebba716c55c2a0f5a34ad5f5b3d4c04cef1c63b6494ec169795f6dd4112eef0c560f60a5e3ebbce7f15bc6f3d3e9b1f432177aee9fd11a80a5b59abad3f670e1781b36796742a85f370498fe18f7a2ecf8300539470a8a5bb12c3976303becd590630e1e4ada4d0eb294247d2cd20767b1fb88f10b986bcf5250906e4b8ccdb122417438f9b64e1dc9929df9b0b833bfa5b038478c167865b5791b41b60663499730b757f594a630772f69cc298b895dfeb95753c3c9c4a99cbb338473219ae5207d4816f4f5eaa6d11567e37ac89ab09ea6e99ced3e7e0e0e2e51decc3bb51424c7be68f027023621cdc916e9d78bade25b5e3f0baa2de784daa47a709c7b62baf5f3e2a6cccba8ed45122e88815edd923aaba717ac630d22bfceffcf08b275c73917b46910670145611db6064021ba3065788aaebdcd276af26e402801e09264344b698d1c43b36c255a034d3e3777aa0697772197445394ca390111e055da0c489ce476c39df087c9e36db7e5e9e4312d2d49355d6d677d9c3d3e84a0df8ab119a9a0d09ecfc99da890f306a5046dde9116ff35effdcffd046ec407c92be41c4aeb4e5472b9bbb1a0e91a95d09138742b1621ba01da21d2b4ee0a88c86b2e705896fdeee1ecdd63a8f6e324fbce487779ad5be0ee9baddbb6d1e1348517eda7b9ad1c61a7b3c72da6b99a9a3e1a2758246f54e70ea5f7b292132a1fc2b30da746799e329ae35c22f15e56a8e549cfa78def7c0e561382cdee8bb89683a8e78e5b3d242ef8f66e6dc31a72eeb43d1c88ddad2ca0a54da357bbdc5a50cef8aee54cd3121ac50a39635e1830db2cdec5e90050cd383e0b16579b3d7268bdf33e42d6d95e4afc3f8c35189253d5a985f2284c96f0c7c06419938b6b83c479942c43a0843728d9f9830a4a764bfb700e254b3408255b8134210f44cf92388851e230780d597727c52244e4b706cf5a425325ea307861106b68c720bf193c0a8132870c84619049f0961809453c6e0dac56c3bc6ac556e7dd6e8f4aaa8dcddb0f01db064323c57158338ce48c0da034395593c78743d0b81a111c0c04cf91a52d49ca483369b38156dba821d9e6a8bf601b8f31a17b60d9e609e9c892adccd529c01943708c39681c84744472485ec7006ce373d05da6dae8f2d0ecd9a1671ae6cdd80797426804bbd70cc79fc29bdab18254866126c1f03d3e865f1ded89e4284ced756334c76085e9e2ecfe5fdb59c6ac7949c18146ab95b4a14cb7e460e713850bf3c9df51a6ff4f51a68dd8815f1f65da084613c9942603a087921c55606d2bf022a7929aa4465e3a873bd58b71a5b3d9a9b7240f67be9d9c29783b05e5b67e324bf10d9863eb24cbe495a501b5c1e41b86a09c9d2de73b9e77a46f4beb86452de7d65a8bf4e25d79244ed4c90c3439d70106802613e5faf96eed4c818905f5138c6659edfc6962663a51a962731d658ce6e31d68c3d2787e0792de521537e355eef26776449a3c4c6fb92557fdca8d12d9b5c8cd6a682d59850c3278b4991c151571829e1ceec178be42ef0b09e82c2139624851d445d6e298aeb9f49365408cb20025bbd58c71414aeeb45c4a3b7ef6ded96b1fd968eecbabc9cd88b7eef2aaac109d1253947e9e0b57330ef5790c71273ea6055bd3ada9e1bda7dcfa4ed34f603cd9c09348a6a5eb61718aad6a33e35212e8559b2d8eaaa89d314177bc4d5682857b26a2768316d60576d0edca38393b8e14d83716edb26bb82bbeb58eb924033c8c70140a46bb52e462d2431d2f77e25097fdbc5b33b4e5505c6ded58cb3bd1ea173456af96703cee5c71d4b986d9b8f950ad73aa791b0bd58ea935ec5cc2cd1ba8436e5238840dbdf3f01a9e97349f723a9f8f933ac915db2931bbe03cbf2a98671894e75701f20c81f1fc86209e91109e270e86cf3159852adca69523708dfc4b85fb7b7c4efe7e18ddb9358395b5b24f638499b5b2e4f4bad7126af790662f39dbea6e4cbfcc5b8629d8c6fa99e43c34672b28559b833edd6cc34d5bf2c636d54fbb52afa6e421c7b3252cd6ad764d84ae94a086a569d4ce3a252acd934db9b4ed724c2ea593999d6df42d737344292fb51021e435b29cc8bfb60e25c758491e35ea9ad821e7fe8b528b5d3e05e450ab45a8f517ceed277dda0973ade57139d6da3c2f10a7b51fa7c9ed186c7fc048da5122279d6bbab608539898a84ef5506e837fae01178f85d7adb48906b59ff919fb342f3429d2dc73039f9a8944d31ac2b4e3f5b7a98b35b554ea6ec8276a695dccd66774b29760db93e03c571a26df8ee06737f12854853506b65a6dba3cbf935820b25478fad443486b85a7d4a774dd4ba615916daf2dacf1b6eb9d6d89dd4ad26a7be8a679372c172334732b1365f2d8ce45b25034f7b4db6c575d3cdd53bc0d8f6686e6c2f8dd78bcecaff3eed71694f01265776a99c21226553b4fbb5222db4002a6e34cafd699f8603a1a3c5ce773fe63ed9b5dd6d6a19cc866c30deb4e53d7bc941149e856f2f3c3c063ff6380c79646f409e64b8a4e038f8d7432596e6a451eaf9f54a0c7db4ba94e428fc350e8b155a4c1335e415d554cf229ec31b9080445f2b773e8c4e03cfa327d28f966b4d79977d2e4048465243f2f61f445ccf20fe3e745f531e1307e5eef52402a4296ab70afd7daabb6a2482bb35d45ce9de2a45674313216093f4fd2f6da8e1e4446f234d7c09c8daa25b06d7724ffb63a222882eab98da4b93600f2b9621d35d05f0d637c0a5849121c318c43fa929203112d2dd1a1864dde38f9b108683fe9b2c1b1a82f72755781ddb5579a7ac02c55cd2212a9cd4bdc22becfa19709f23db3c33ca55d81404c54125847b1c7467ad4edb085183b01cf99f48d741c097160c7de17598d5f4f21ed13389f240df358760f90dde3179fd1d832e273e47c6bb7c1c6126e9f50b5046c8336ef8bfa87f8730d1919c76d0be22da9495c1ce40ad5b9d476fbaa6b39c2ea8fa83f7830959303051a164fa8b08b5ef2f567bd9d49a77aad345873b8c661c1bf95178d558fecf6ddc75370a83168739941cd8c1acdee198ff898a602bb829243b23b42ee47e4f1d1777351f079a4c2fd2d31cf60ed7f67aefe5fd65340e75882edd684312cc1cc55e288a5badda89b25a86642a75e5a6a347af7226a9c6fe81c3e6f59d71bdb30107986c5f582f4314ea8b81260a09d0233931a8ee10646e1859eacce0ddcdedf10d6d46daf7e916a25eefd45b56debc49aee87f0881219eab848fd7092e93b1f4dcb5c20cd7cd4e82a8d3b2729bf28705ec40374b35bbb2b08812777d8b5f65309ba01fe5074a14fdbb58484d9d9dcf0c69aee7671f2b98b6cb74d53bade67dddb7ea55a63ee3e69ab12c4019dacd1df498a0b6e7a90ad2a408d53a795ce0fb4e627b7376776d9a90618e4933448d5279da375f486ec1e726d4301d290d7c84a8539af9fd9bf5b47150b00b58da50193cbf5ec4675133a5fa9e89dbdc8c12e409f23ab5e0661bb02bd8c9a38b9660c6cba5c37deab9cac80cb6205b77afb733b6730e28c03eb663bf60b106c67a327f74be11a116873a764cce0e8125bf44dacd61a6b84948db19f4a9622d76c7185a9dd10f06d50806ddda72c7693db08de658913be6728433887ccb030803d98a371e93e410db56db2309dea063007435c3075bba5d2179a5bb853f1b8cde1ced40b5a78dbfe6b92b71b2e5ad97b04e1ba12cd68ffc1c3aa9e3302abdfb1ab5f2ff729dea0708be76d5bd919373982fbbd40287cf6c03375badb11b4ce227c4cd2d2e97e2f67c011216482e84e052d6739e343ef255947aaa999c1a7ed8c16f966ad3965d6a964be59cb2c6447187d2eb045bdd264f4aaa6579e8c41d667a9946919742b17d15526b77e84690c50703920f7ae14b18ecadc55b81bc7dbfcde12f298335c7f6edb6131cd0ea75365bb0b224c9daf83a69ec5f76ba530750215b49a7713b565b334389cd8ac61499276aa9ae389f2009ebd8980c519feb67f615b1ff6dce1bbd36da168680f63c52737f7cef6ea67499829e2dc4df389948eb1e00c99d244d535b1b4f6adc0d7b6088457be944e1df31dc4bb49dd1c4f9b7338386452730ea73ca9c75a69b6d26258088a3bf582cbbb94f2ed423136e56fe00c338ee114e70ac0fd531fd6513d59964a943beba8a99b1967f1fe39726aa5dd7634f38b7793618833e69a5223f919cdc40fd34ca1ae99348a4a6b5372af5676836e85906843b7f1d626d66ebf1d446f9296dec7dda82d57afe5db53da84dadd6b73f9b89b8dc7ca94151b3973b3097aac9210b5df64e06bafb98f87fa98e18971c993d4b52e39309f51f21333fc7907c6cf6ea179860391b63eb2ea5a6e6d619f7c7dcdbed7369f78c3edd4d4a81496344b276385776ae7b31a2dc4c20160bbdfdcf4b326bdf371ab695438adfd889de32bb23624eef47e7ab15fcb938cad7a2e397632985caf0619cf606298eaf9ecdacbb36257b3e5f8ef91dd6eb2e0e77adf796efeecd59879eafd2c69dcdcfec71ae6eb223b95f2b4e43d4a047959b1dcdbd92434595f6751682b5f805f8a3a3b533c74dbe026943226c932334f63efbdfdf589ba613766666eaf5b4ea6f67e7cf1ea70ea68edd4f47af22d8ddff170797bda5c6bde9ddaa5b8dc3b5872e9ab3b6c624f510a331d469f72cad6d5944b56658ec32661228ef924f7e256507495dde4b6ed756a296e121cd2027de9d43056b7a169325bc7cee35ad8edd3ac80ffdc5c9e1cceb5053fbb55ad107206f08e1424b3a4d9e7477a82f9075d4614d03bf5917d5f4fb09078c114ae3dc1eb27534ff0ff004da9962c0a656e6473747265616d0a656e646f626a0a31322030206f626a0a3c3c2f46696c746572202f466c6174654465636f64650a2f4c656e67746820343939343e3e2073747265616d0a789ccd5deb8e1d396efedf4f715ec0344989ba008601777b7a363f064876fd028bc9ee028b9d20d96c803c7e40955457e954a9aa3a58cfb8ed53ed667d92488ae24df4c0073e3ed1031f3ef2e3d7df5efeeb05bca4a7e5cf5f7f7ba187fef7fb9fd31ff4f8fb5f5e3eff6c1e7ff9ef17fd7e20f72014f7f8fb9f5efefcf26f2b0a9ef5ff5f7f7b8118023fe65f7ffff3e2e3f075a2fdf977e6f1e5cbe75fdefee5fb031f5fbfbe7e7f4bef736c1f6c9b6f0b112862a470eaa53ffdf2f6f2f95fc7f7d2f8de4fc0623d23ba018003977e357110064089e24fe1d017a28f1262b0767823efbe910d440ecce6e42b01a38845e3fcd1315a061f5df072c764f338d9c01e9d579e521c82038ed0c6e123382762ee80612618d64a40f4e1e802440131f624ebe1031c63341887e937616fd8cc062c72b865d876c6ea623c7b267770dc6c22b0277b76dc9fc038264bf128a7b3089045b2a75f48c12391e7a3331d3d88c815a5f23b1ea75a260e135def90076e08a2fe6ae3308c80469cbd63c5dd6cc5d17a1742401a80e0de0a184b10d1dec2797e9a0e626f2dd9ac648ddd5b17e31c78cff19cfec1071864f1e4f820e399c0e02cb9b3afb3de7ba440475f170308219f1e9e130e86d11c7c9f250bc68748a7e54a508c278c475f6810d87a393ba19fc018648be1a88ab6d60191e3f3232411227459751c78a32388c186d33c838c4851cc51a6b1de431023e7ac2e15c22864a3370775a3a08067267f41374e965e989481f1c83e964da16df109334432e616651467ca88442486180eea44b1167ca0788fe53999bcc0115dc42c54fb4a515c0427e84e9b81d649603ccc7012048422c7d35aca62149483af734860828fe7377f21cfc28795be230f2c4ece8eef1318cbc46c8f4ea8330688852f9837cec5c874582d3a1b2046737a05110399809c17715f6938ef2038965b0e0e341dd380826117f8e88ee7228337745a571a09a6e388968fc228f498bee85b964fdaea91ca21e9f5c7cbe777fb200f467fd9c78f3fbfd0749a07d1f393f8c78fdf942148c045b2e8f9f1e3df1f5f10c97e7dfcf8eb4b04673c06c5989f4be339a5e73ffde879315bc090b6be2d003467080688c801b942d07c4b04c981d11dda8711bb7dad8fc9bea5e706828ddef1f4dca5e7cac3161dcb9a501f66ef01ad44b2774d4220080e996385a098c6501bcb2dc3720b788f16697aee4f002322f014896e5b6f2207628c35b505176e8c359e7993c164a519731b7623e063245b5ba78cd142206b48265e95d018d47b83571bcf091b0bdbe2edbce25b442dd6694bc94f67241b2d9012ba4d556080e88309b5d9f78d2135265f626ba89dabb5605917fdf48d86dccab08c64c11a6b7d08fb58a9f1fc8c441b0cc0ca3477ad8a210348365465e2808e3241fc7a0a3a1198e496b572db902c43f0c6d7184dde5ad2d6d05d59fc3b117884408c74db90bc8063676a5bd692236de0fd31eda89c3e6c960c9077ecef1aac250f31a2d40836755c73ac6d799d6b7cc403a4e65b333953d7d4734a4d4d2d9d7bca1926140c206caa3bf5a9751132608c773541956ceb310819afe796aa4d175bfb9b21dab50e99cf8016033e44f79c3b77a3569de783d949a8042f0a66b7026b7591acf1520e06166c183e0fa30e88f2aa1b92f2814a804e5dfefb465e9f5257d72c614c3bf0ea2d5b86784ac91390a8f86d0859ab3b9eea18658a01a608227d9fbfe00ffff9c7fff8f2e5f3b75ffff13f7ffcdb8f3ffdef3f1e5fde7f7a7f67c4d7af8faf5f1f3a61fb28883d9046bb9e0ce897b7c383c2c72723e02c8b0f99caab41e481818f5289e0fdf06143ad7392c90253a8114a938c5dc48cd3d89921731996450831e9de0d2541d59ec3826f75d6738ef270cfac055279575fdb76da5c8687aafd27a8499cacaa6555c1ddd0c90998c0e186b92517a1412909d35b06fbda473506e040b515ebc4c7c8e0d9a9f9b9995cc993e8f4c091059fba75143bd3e2fa5eacce0f5642056bd69f12b31e7dcfcc60327364ec3ad75b3fcb8e9c99d60c75e2372e0079f5186e2875aa24e3191c798ad731a9efa42afaf635aba534a57d0a45bd14e2035d574de440dde435f1c9db669277ceacf9ad8fba4370f505e9c5e904a8be2076b5dd2755fa361327d73dbf620d98ba46ecc42dd6433012edadea49bc0356957d191f3e3e8983942042c509a9223de22a6bdfb75a510f73b2a5dd3d7ba04353ee5c532a5653a7b20c081a86bc015b1050afb99a866b4aac33f77d86f1db78443abc0119078424ca8217819245109b129cee9a45721ed8a6d8cc65749ea081edbc7e6474837d71191e1316f3624d49e57734ddf2f6ddbd75330c87f2cb389d8320a49be80667bffc72b0e0ac86842ee30a1130262b75232576d035acbac6f56daacc106e595fc31e4c7d7d4fca86110bc8e686b93312a025b7d9fe5ed8e1fab97fafb36cc1a075f1325ecb01aa60df26db3009890a4e01ecf3f7b3814184f86afb36093249193d1dc07ee2e7797f45c93a6ca15517cf538785e1da897f9f147331fcdbce89dd4cd3f3e32e29802db03ba33ee62968380afabd31753f41d519b3eb2768b809ae819a7909d684fabc045075125c0337f3116ca6ec361f41cb457071b1270fc1665ebb4cf08683e01aba997f6033b17179f82afaf3d8a6b4b40e08eee0027652f6dd0dd85b1d044b0123882a6157d16ba26d3ed56d5cc65d7a2805ab8643dd45445e5a5cd467fd2ef54884e8ab1cd5a990f4c70723bf2638fdb6eff2407f1d9fc741f55666aff8046622936ca3b7158776adbbd8a8c9eed7e548d4465456bc53254960b031d941d7d055bcfa266d3c93bb721bf67cce48c5d03ae1ae5832cd78ecac3af8bb15a36718d6f31a2edd651b4e682e7e00e53a3df1b83c83d94b95f4a33f6af82ef7351a8e7c4fbd54bb2537e7ed3f77cdfee357e5abaeedc78006e36ed8c7b412c656a360494b14af57d6129d3c65c1e3e062ba86d24720fdf10aca7177e55aaed253aed118f765938a78d8926be6e0cc04bc2984b9768cd58de463f1cb3d45979d9ea32339fcd329ba43ee92a5b7f826548e9ba8d206bbebe25c7962f1b48f7d4168e4836a08a3781fd4eb70e218c2d9d37e19a66667b6c2dce3114aadfdb2d5766fb3e95cafceaccb508305f5a2d402c2d5648521cb07c1a96f7dcaf2e9b3f35305e6d938e6829035ad30e624de7ddb05817e3a15c65a1212703eaaafadc602930d932358732f5f176263055077a1ab888d9abc751be3fa4e69a26b2d54afeb849265505397ae887d9e4b3963f95b7b21d9624148b22365278ef99e6deda4bcba943d8ea7806b48055dc3362e81c134a50ab0cb88134d5ead06c43bf1590649bede8391eb3cc3dd6ad56100ad3fbd2c4b9558ebc891893bbb64875394a1167eecf58a34830ca78e54ce0c49f0a702970b421e5c23749416733cca77b9901d44a57a79da08a915ba2b823cf89267029dd8afdb757936ceb5340d6c2bcc958e10b1cf3cf025abe322aac825a96383ea928ed113ee6e48e81821df8a4e1fca3ae9f67512ee07846b47fa60b47ed1a7e2477d8e7a921ffed23ec097a6050559aecaf50b805a1408d6c740dec4729437c0291473ccdf100d18d69242f537881639cfbfaacb61f330819602da3e3e3158235efb8ae83904e70ffef6f287fd7e17c7dd1cf32e17149653345547aed6d05b12e3b14c10a35613ab6b32db9d836e270f8ed9cfea3f72b10431388d03ba4d659f001a63e36454e77c7ea224d0cf6a960e81150f9138682dc21af446540e11741618bd95b025c8af6379a323475361c1c60d74e84daacb0dba2877412734c02ca63619ec1ad8b393b6b682edb5b5adef6c4c9363c09d011758d4e77fd354380d2224d5bce1e53c139a904762c95f9b8a70ef543047a060b5eea73d13bb5d69ce3b454bef85a3d977db48d491ed789989d68c1bf7e66269b54a23c0316dc89d392ca0097c3780b3381abcb508f4b5b3f3721a30426ae0732af4bc244506426b460beae4d03b92fdb1242d9432779f4fed5edba3d38cce7839ebe5549ee992ec9868dabf4e4b42b34cd31529ca45f98749796c91ea46f5249490662f9f6f17095598e3eda3dbb3ef95e40737e5a98aa7352949c546958064f16f8cd9b125b6984ee9b7040d56a952964a56deb9b8c1869d3781be5349bf2b2ec471bdfb5d0d2b5232068fd6a4a817d518f5be0acae5b0772d4e1a675c910a623a990d19348de68eb9239ccafeae4e9e3694a09b60693966ce09af4e5f9e3a55a853726dafcc36bd6afde2ef52aefd166db74a5547419d543faae853de7ea520e38e0d89ad0726acd57bf42265216830f4f9cab1e52b0c71d21237a035dae6a4ae254a1e5bd99e12da5502d1d22f7693d237517b7a9a67c3eb54fa9b5a99eebc9895fd32058cfb1d552b5253c8784daa5be163c3e97566136ab81d79bdfb17dd2fbd4a114b0add55b4447648c5dcc2edd7581aedadd3eac765d48e1a22a39b69bc9423ba568db1e8aeab90194dd15d1bc7e9216da04c9b99420f73252e6e578ed60fd11ad625a17ce2deeed41adec3d0057b9ef9e4110d22f2fb305456f747fe9d3e1fca1beb5c6037e55cac317533a59bd22e56b4fa852560a2156e80152c444e678ecdacdf282aacbd06071d7915318b19bc0d5b5263c14c89b4a7249b29fbab84c13e5014cc70966d0fb35314624c119f30daad27ed5496b11e614db2db72c194dca16bb922d5cdc8ba07d749f56f9d5a393d68a1cd9ccd0a2ed2efc2c4ca0aae5657d52bda94d2db551eaf0e839c2bdbf39a543262438ed4e7e8fc208f9dacc0da3f3b597957d1b2a19282b4416bb3ce2dc1dce664cfb6af1b358ef101aac0bad93d9892ce501de3096c9610f2b9f42aba5473e0920d52e597dd43cf4d9acf7a5b4e9cad21756a3e6204f662e2787650d17dcbbbbe9d2c81740c4d1deb32c714ef5ea8fcdb5218363a9c064714775ad1acb1925c90b0c6d92d446cb50d65f220ae68752b54b6d8a2d58fcb0ad8c134d8d0e2a7f5b41fb5bb32c1d0e0b83db85e26b35ae8954a93f2c0c672925e037e56d5b8a2d93ff1b300d59256ff0e3b2f92bc88cbca10ee0a155a6608c1c5c1ca58b4cbcc3add9ddf606398b9f52f0e4263d65395c08ad898579c379f3160f0fe01ecac01a9724c6d0eab979f1d8344f2d16ff879384625d741a7b2b37174ba6ce89f891b951ab915ad5381a306ad3391a3c6088bf538146cf67a484abdd46580a4ad084b59ee9ad8e87d2d5be02c873f1956650cefb354d96268553b0b7c4448c9d9e23c6dce462fbb07a341da72341a322330e5e2cf5490f9367313e848bfe733403612d2f36fd9a5d0bb2cac1670ee783847d3bdbe2cc50334a7d3ef1bb0a317fc1a1ebd34251ba9cb69ce09e2631abb16e38df23119fce9fb6feb62e6ce9dd08f69f99706c37ecccaa7399d79ea78e2ff79393e1ec93e5d9fff05f23e5587bb7b95caf95b02b85c8870f1960033ac112148b09edc819efa677ac77284202184db7afaea1d293edd7bb4d7c0d89903fd731bf7046c4d9723d70130b02189e1aeb13ebb5fa0ddd4bdf34a845657f16d86c4a1aefe161c13db1bef09889ad12aaed67db8644ea666c181ed6c339033efb27aca364cb7b5db26aba1362fd59ed6cdeed9ad25dc692d7ebc0bf499eedc8c08c60ce7c49bdaf80b90e80d0695a9e96dcbdfbaeda2791148f39686b753b7a1381031ddada197d75b9d4f3ae3abd995e386d8956bc7a73a7dac1aa135db04ed17feac3a8a9e6fe9b3eafdd9ece973430fc84863b2ca459cd101e612a5ea7a96e8f17b5ffe24536a0b7447deac16093792e6d4501fbd4a87f29a569d16a7fae3ab28db997dfca479cfacc2d7735988a244b06fce53764cbdd951af386972cc50837453a6327b03aad06ec0e6038c7ea595a8cffd8a2982d027fa242931edba3ad274f7563ffa386380be7ebfc68654b377bd5dbe110328a92be15d99e8da6be979e7fbc39422f8a1baec8333d1ad8d4302cd755d2f2625e2d79aa09daae35eb660c49ced7219a79e1e730bef0dce31deb3f4c216ed7aa257a7defad8a829e8c51d62a9ecdff0c4b9fc7e8763af80aef47e59dce079ded43257f3fbefccb798250e5fcd4a7761cc5bd9907aad65f4cd1c6dd57cb5ec2eca916cfd19ede5846f1fe1722404edec663e2a8b9dcceb07c00e1f967f594f1fb96bb6a71c938f4904fbb0d9fea0649d5b2b762e27c84c153b9b04999bd2a3d3d58d797fb89c08c35832c636a45e5bd52359f56c4a2366cfab39ff1fa57e825e4c9a9a8c7f5052c48749c4c705d82f75e2de6e4d2521e06a5c78ec6cb8a5f47a22c7e4ad27f764cd7e4772f0ec64e83647be7b07f3796b67af87f72d55bb7715edde5fb37b5bc9eeff5bc5ee7d05bb47eb7527cc7deba317d9dfb1d0d64e01cc932db8fb9a5ea5c4cab327e64d5a65e3c07c4bd32b0e37b5884e3b5cfd9c310a5377ff4543546eebb9d82e5add3f0d81ea72da2c7d3616f62e1138462794ee83d593fba2156317e1e05a4dc73b11c6a167cab3c53dd56ec832c33d5700b00335db2bfebd61617b05c38a831b14b95ee3951a696c61cdcbd0bf9fed5ca917af8e9963971a6bebcdbaf90aeedacd0e7d7d530deeb49a3d4ac7969adafadd9f5dc484cb752d577b90bb745b4b4b23d7ba97edbbfb17e62c377df4971b928f029b0d06fcd6ad957d72e29ebb9b6e29b4597f6e7ba5f6b12ea09a1e97f18840bee16c03a894d9a5f4a61e9a91e06457820515b52ceb970df60746964616a74ceaebfd3949a3ab8d2b0bc7edcb5fa9b5596659dbe214b8d858b658c07b92d267b6e594b9eb0d79871be86a7da3e7fdb6fbac530d679ebd03719d94978f291b74b7841c9687ab310a75b131af8c41a87bfbb39a8810dcc9ab4f97844af260b521c018b5475477b974c7c997764ec817dc988b7dd7c78be536b33ae6ceaf1b3bd6dc1291c11be2a7ed180ba06adb451b2d0c1e6702af1bbebadaf69b2faa5fe3ff008f58195f0a656e6473747265616d0a656e646f626a0a322030206f626a0a3c3c2f54797065202f506167650a2f5265736f7572636573203c3c2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f457874475374617465203c3c2f47332033203020520a2f47352035203020523e3e0a2f466f6e74203c3c2f46342034203020523e3e3e3e0a2f4d65646961426f78205b30203020363132203739325d0a2f436f6e74656e74732036203020520a2f537472756374506172656e747320300a2f54616273202f530a2f506172656e74203133203020523e3e0a656e646f626a0a372030206f626a0a3c3c2f54797065202f506167650a2f5265736f7572636573203c3c2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f457874475374617465203c3c2f47332033203020520a2f47352035203020523e3e0a2f466f6e74203c3c2f46342034203020523e3e3e3e0a2f4d65646961426f78205b30203020363132203739325d0a2f436f6e74656e74732038203020520a2f537472756374506172656e747320310a2f54616273202f530a2f506172656e74203133203020523e3e0a656e646f626a0a392030206f626a0a3c3c2f54797065202f506167650a2f5265736f7572636573203c3c2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f457874475374617465203c3c2f47332033203020520a2f47352035203020523e3e0a2f466f6e74203c3c2f46342034203020523e3e3e3e0a2f4d65646961426f78205b30203020363132203739325d0a2f436f6e74656e7473203130203020520a2f537472756374506172656e747320320a2f54616273202f530a2f506172656e74203133203020523e3e0a656e646f626a0a31312030206f626a0a3c3c2f54797065202f506167650a2f5265736f7572636573203c3c2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f457874475374617465203c3c2f47332033203020520a2f47352035203020523e3e0a2f466f6e74203c3c2f46342034203020523e3e3e3e0a2f4d65646961426f78205b30203020363132203739325d0a2f436f6e74656e7473203132203020520a2f537472756374506172656e747320330a2f54616273202f530a2f506172656e74203133203020523e3e0a656e646f626a0a31332030206f626a0a3c3c2f54797065202f50616765730a2f436f756e7420340a2f4b696473205b3220302052203720302052203920302052203131203020525d3e3e0a656e646f626a0a31342030206f626a0a3c3c2f682e376b306e776c6675616d6237205b3220302052202f58595a2037322037323020305d0a2f682e363632697635647239343431205b3220302052202f58595a203732203536362e303530373820305d0a2f682e336d74633036387931753533205b3220302052202f58595a203732203335362e333634323620305d0a2f682e62686e6d326e377675746c67205b3220302052202f58595a203732203137342e353436333920305d0a2f682e39353065696835636235636b205b3720302052202f58595a203732203636312e373136343320305d0a2f682e39353065696835636235636b205b3720302052202f58595a203732203634342e353235333920305d0a2f682e627565756a31317164656671205b3720302052202f58595a203732203436322e373037353220305d0a2f682e696166326266326c366b6d75205b3720302052202f58595a203732203332342e363236393520305d0a2f682e696166326266326c366b6d75205b3720302052202f58595a203732203330372e343335393120305d0a2f682e3830616a693977626439696a205b3720302052202f58595a203732203135332e34383636393420305d0a2f682e716b336b30637a35346a617a205b3920302052202f58595a203732203632312e383437373820305d0a2f682e347a656575326673746a3374205b3920302052202f58595a203732203436372e383938353620305d0a2f682e6b37387364696f366b663475205b3920302052202f58595a203732203238362e303830353720305d0a2f682e6b37387364696f366b663475205b3920302052202f58595a203732203236382e383839363520305d0a2f682e6163756b7770623978307931205b313120302052202f58595a2037322037323020305d0a2f682e317161796461646b72743231205b313120302052202f58595a203732203439342e343434383220305d0a2f682e716d38796877726e32377770205b313120302052202f58595a203732203238362e323737383320305d3e3e0a656e646f626a0a31372030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672032203020520a2f4b205b302031345d3e3e0a656e646f626a0a31382030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b312031355d3e3e0a656e646f626a0a31392030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b322031365d3e3e0a656e646f626a0a32302030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b2031373e3e0a656e646f626a0a32312030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672032203020520a2f4b205b332031385d3e3e0a656e646f626a0a32322030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b342031395d3e3e0a656e646f626a0a32332030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b352032305d3e3e0a656e646f626a0a32342030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b362032315d3e3e0a656e646f626a0a32352030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b372032325d3e3e0a656e646f626a0a32362030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b2032333e3e0a656e646f626a0a32372030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672032203020520a2f4b205b382032345d3e3e0a656e646f626a0a32382030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b392032355d3e3e0a656e646f626a0a32392030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b31302032365d3e3e0a656e646f626a0a33302030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b31312032375d3e3e0a656e646f626a0a33312030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b2032383e3e0a656e646f626a0a33322030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672032203020520a2f4b205b31322032395d3e3e0a656e646f626a0a33332030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672032203020520a2f4b205b31332033305d3e3e0a656e646f626a0a33342030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b302031335d3e3e0a656e646f626a0a33352030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b2031343e3e0a656e646f626a0a33362030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672037203020520a2f4b205b312031355d3e3e0a656e646f626a0a33372030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b322031365d3e3e0a656e646f626a0a33382030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b332031375d3e3e0a656e646f626a0a33392030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b342031385d3e3e0a656e646f626a0a34302030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b2031393e3e0a656e646f626a0a34312030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672037203020520a2f4b205b352032305d3e3e0a656e646f626a0a34322030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b362032315d3e3e0a656e646f626a0a34332030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b372032325d3e3e0a656e646f626a0a34342030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b2032333e3e0a656e646f626a0a34352030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672037203020520a2f4b205b382032345d3e3e0a656e646f626a0a34362030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b392032355d3e3e0a656e646f626a0a34372030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b31302032365d3e3e0a656e646f626a0a34382030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b2032373e3e0a656e646f626a0a34392030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672037203020520a2f4b205b31312032385d3e3e0a656e646f626a0a35302030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672037203020520a2f4b205b31322032395d3e3e0a656e646f626a0a35312030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b302031345d3e3e0a656e646f626a0a35322030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b312031355d3e3e0a656e646f626a0a35332030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b322031365d3e3e0a656e646f626a0a35342030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b2031373e3e0a656e646f626a0a35352030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672039203020520a2f4b205b332031385d3e3e0a656e646f626a0a35362030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b342031395d3e3e0a656e646f626a0a35372030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b352032305d3e3e0a656e646f626a0a35382030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b2032313e3e0a656e646f626a0a35392030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672039203020520a2f4b205b362032325d3e3e0a656e646f626a0a36302030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b372032335d3e3e0a656e646f626a0a36312030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b382032345d3e3e0a656e646f626a0a36322030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b392032355d3e3e0a656e646f626a0a36332030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b2032363e3e0a656e646f626a0a36342030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f50672039203020520a2f4b205b31302032375d3e3e0a656e646f626a0a36352030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b31312032385d3e3e0a656e646f626a0a36362030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b31322032395d3e3e0a656e646f626a0a36372030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b205b31332033305d3e3e0a656e646f626a0a36382030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f50672039203020520a2f4b2033313e3e0a656e646f626a0a36392030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f5067203131203020520a2f4b205b302031325d3e3e0a656e646f626a0a37302030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b312031335d3e3e0a656e646f626a0a37312030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b322031345d3e3e0a656e646f626a0a37322030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b332031355d3e3e0a656e646f626a0a37332030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b342031365d3e3e0a656e646f626a0a37342030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b2031373e3e0a656e646f626a0a37352030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48320a2f50203136203020520a2f5067203131203020520a2f4b205b352031385d3e3e0a656e646f626a0a37362030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b362031395d3e3e0a656e646f626a0a37372030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b372032305d3e3e0a656e646f626a0a37382030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f48330a2f50203136203020520a2f5067203131203020520a2f4b205b382032315d3e3e0a656e646f626a0a37392030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b392032325d3e3e0a656e646f626a0a38302030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b31302032335d3e3e0a656e646f626a0a38312030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f500a2f50203136203020520a2f5067203131203020520a2f4b205b31312032345d3e3e0a656e646f626a0a31362030206f626a0a3c3c2f54797065202f537472756374456c656d0a2f53202f446f63756d656e740a2f50203135203020520a2f4b205b313720302052203138203020522031392030205220323020302052203231203020522032322030205220323320302052203234203020522032352030205220323620302052203237203020522032382030205220323920302052203330203020522033312030205220333220302052203333203020522033342030205220333520302052203336203020522033372030205220333820302052203339203020522034302030205220343120302052203432203020522034332030205220343420302052203435203020522034362030205220343720302052203438203020522034392030205220353020302052203531203020522035322030205220353320302052203534203020522035352030205220353620302052203537203020522035382030205220353920302052203630203020522036312030205220363220302052203633203020522036342030205220363520302052203636203020522036372030205220363820302052203639203020522037302030205220373120302052203732203020522037332030205220373420302052203735203020522037362030205220373720302052203738203020522037392030205220383020302052203831203020525d3e3e0a656e646f626a0a38322030206f626a0a5b3137203020522031382030205220313920302052203231203020522032322030205220323320302052203234203020522032352030205220323720302052203238203020522032392030205220333020302052203332203020522033332030205220313720302052203138203020522031392030205220323020302052203231203020522032322030205220323320302052203234203020522032352030205220323620302052203237203020522032382030205220323920302052203330203020522033312030205220333220302052203333203020525d0a656e646f626a0a38332030206f626a0a5b33342030205220333620302052203337203020522033382030205220333920302052203431203020522034322030205220343320302052203435203020522034362030205220343720302052203439203020522035302030205220333420302052203335203020522033362030205220333720302052203338203020522033392030205220343020302052203431203020522034322030205220343320302052203434203020522034352030205220343620302052203437203020522034382030205220343920302052203530203020525d0a656e646f626a0a38342030206f626a0a5b353120302052203532203020522035332030205220353520302052203536203020522035372030205220353920302052203630203020522036312030205220363220302052203634203020522036352030205220363620302052203637203020522035312030205220353220302052203533203020522035342030205220353520302052203536203020522035372030205220353820302052203539203020522036302030205220363120302052203632203020522036332030205220363420302052203635203020522036362030205220363720302052203638203020525d0a656e646f626a0a38352030206f626a0a5b3639203020522037302030205220373120302052203732203020522037332030205220373520302052203736203020522037372030205220373820302052203739203020522038302030205220383120302052203639203020522037302030205220373120302052203732203020522037332030205220373420302052203735203020522037362030205220373720302052203738203020522037392030205220383020302052203831203020525d0a656e646f626a0a38362030206f626a0a3c3c2f54797065202f506172656e74547265650a2f4e756d73205b30203832203020522031203833203020522032203834203020522033203835203020525d3e3e0a656e646f626a0a31352030206f626a0a3c3c2f54797065202f53747275637454726565526f6f740a2f4b203136203020520a2f506172656e74547265654e6578744b657920340a2f506172656e7454726565203836203020523e3e0a656e646f626a0a38382030206f626a0a3c3c2f5469746c652028312e205768617420697320507974686f6e2c20616e642077686174206861766520796f75207573656420697420666f723f20290a2f44657374205b3220302052202f58595a2037322037323020305d0a2f506172656e74203837203020520a2f5345203137203020520a2f4e657874203839203020523e3e0a656e646f626a0a38392030206f626a0a3c3c2f5469746c65203c46454646303033323030324530303230303035373030363830303639303036333030363830303230303035303030373930303734303036383030364630303645303032303030363630303732303036313030364430303635303037373030364630303732303036423030323030303638303036313030373630303635303032303030373930303646303037353030323030303737303036463030373230303642303036353030363430303230303037373030363930303734303036383030323032303134303032303030343430303641303036313030364530303637303036463030324330303230303034363030364330303631303037333030364230303243303032303030364630303732303032303030343630303631303037333030373430303431303035303030343930303346303032303e0a2f44657374205b3220302052202f58595a2037322035363620305d0a2f506172656e74203837203020520a2f5345203231203020520a2f50726576203838203020520a2f4e657874203930203020523e3e0a656e646f626a0a39302030206f626a0a3c3c2f5469746c652028332e2057686174206b696e64206f66206170706c69636174696f6e73206861766520796f75206275696c74207573696e6720507974686f6e3f20290a2f44657374205b3220302052202f58595a2037322033353620305d0a2f506172656e74203837203020520a2f5345203237203020520a2f50726576203839203020520a2f4e657874203931203020523e3e0a656e646f626a0a39312030206f626a0a3c3c2f5469746c652028342e205768617420697320616e204150492c20696e2073696d706c65207465726d733f20290a2f44657374205b3220302052202f58595a2037322031373520305d0a2f506172656e74203837203020520a2f5345203332203020520a2f50726576203930203020520a2f4e657874203932203020523e3e0a656e646f626a0a39322030206f626a0a3c3c2f5469746c65203c464546463030333530303245303032303030343830303631303037363030363530303230303037393030364630303735303032303030373730303646303037323030364230303635303036343030323030303737303036393030373430303638303032303030363430303631303037343030363130303632303036313030373330303635303037333030334630303230303035373030363830303639303036333030363830303230303036463030364530303635303032303230313430303230303034443030373930303533303035313030344330303243303032303030353030303646303037333030373430303637303037323030363530303533303035313030344330303243303032303030344430303646303036453030363730303646303034343030343230303243303032303030363530303734303036333030324530303346303032303e0a2f44657374205b3720302052202f58595a2037322036363220305d0a2f506172656e74203837203020520a2f5345203336203020520a2f50726576203931203020520a2f4e657874203933203020523e3e0a656e646f626a0a39332030206f626a0a3c3c2f5469746c652028362e20576861742069732074686520726f6c65206f66206120646174616261736520696e206120776562206170706c69636174696f6e3f20290a2f44657374205b3720302052202f58595a2037322034363320305d0a2f506172656e74203837203020520a2f5345203431203020520a2f50726576203932203020520a2f4e657874203934203020523e3e0a656e646f626a0a39342030206f626a0a3c3c2f5469746c65203c4645464630303337303032453030323030303537303036383030363130303734303032303030363630303732303036463030364530303734303036353030364530303634303032303030373430303635303036333030363830303645303036463030364330303646303036373030363930303635303037333030323030303638303036313030373630303635303032303030373930303646303037353030323030303737303036463030373230303642303036353030363430303230303037373030363930303734303036383030323032303134303032303030343830303534303034443030344330303243303032303030343330303533303035333030324330303230303034413030363130303736303036313030353330303633303037323030363930303730303037343030324330303230303035323030363530303631303036333030373430303243303032303030343130303645303036373030373530303643303036313030373230303243303032303030363530303734303036333030324530303346303032303e0a2f44657374205b3720302052202f58595a2037322033323520305d0a2f506172656e74203837203020520a2f5345203435203020520a2f50726576203933203020520a2f4e657874203935203020523e3e0a656e646f626a0a39352030206f626a0a3c3c2f5469746c652028382e20486f7720646f6573207468652066726f6e74656e6420636f6d6d756e696361746520776974682074686520507974686f6e206261636b656e643f20290a2f44657374205b3720302052202f58595a2037322031353320305d0a2f506172656e74203837203020520a2f5345203439203020520a2f50726576203934203020520a2f4e657874203936203020523e3e0a656e646f626a0a39362030206f626a0a3c3c2f5469746c652028392e204861766520796f7520776f726b65642077697468204769742f4769744875623f205768617420646f20796f752075736520697420666f723f20290a2f44657374205b3920302052202f58595a2037322036323220305d0a2f506172656e74203837203020520a2f5345203535203020520a2f50726576203935203020520a2f4e657874203937203020523e3e0a656e646f626a0a39372030206f626a0a3c3c2f5469746c65202831302e204861766520796f75206465706c6f79656420616e79206170706c69636174696f6e3f20576865726520776173206974206465706c6f7965643f20290a2f44657374205b3920302052202f58595a2037322034363820305d0a2f506172656e74203837203020520a2f5345203539203020520a2f50726576203936203020520a2f4e657874203938203020523e3e0a656e646f626a0a39382030206f626a0a3c3c2f5469746c65203c464546463030333130303331303032453030323030303433303036313030364530303230303037393030364630303735303032303030363530303738303037303030364330303631303036393030364530303230303037393030364630303735303037323030323030303730303037323030364630303641303036353030363330303734303032303030363930303645303032303030373330303639303036443030373030303643303036353030323030303734303036353030373230303644303037333030323032303134303032303030363630303732303036463030364530303734303036353030364530303634303032433030323030303632303036313030363330303642303036353030364530303634303032433030323030303631303036453030363430303230303036343030363130303734303036313030363230303631303037333030363530303346303032303e0a2f44657374205b3920302052202f58595a203732203238352e393939383820305d0a2f506172656e74203837203020520a2f5345203634203020520a2f50726576203937203020520a2f4e657874203939203020523e3e0a656e646f626a0a39392030206f626a0a3c3c2f5469746c65202831322e2057686963682070617274206f662066756c6c2d737461636b20646576656c6f706d656e742061726520796f75206d6f737420636f6d666f727461626c6520776974683f20290a2f44657374205b313120302052202f58595a2037322037323020305d0a2f506172656e74203837203020520a2f5345203639203020520a2f50726576203938203020520a2f4e65787420313030203020523e3e0a656e646f626a0a3130312030206f626a0a3c3c2f5469746c652028546865206d61696e207468696e672048522073686f756c642076657269667920290a2f44657374205b313120302052202f58595a203732203238362e303030313220305d0a2f506172656e7420313030203020520a2f5345203738203020523e3e0a656e646f626a0a3130302030206f626a0a3c3c2f5469746c652028517569636b20485220436865617420536865657420290a2f44657374205b313120302052202f58595a2037322034393420305d0a2f506172656e74203837203020520a2f5345203735203020520a2f50726576203939203020520a2f466972737420313031203020520a2f4c61737420313031203020520a2f436f756e7420313e3e0a656e646f626a0a38372030206f626a0a3c3c2f54797065202f4f75746c696e65730a2f4669727374203838203020520a2f4c61737420313030203020520a2f436f756e742031343e3e0a656e646f626a0a3130322030206f626a0a3c3c2f54797065202f436174616c6f670a2f5061676573203133203020520a2f4465737473203134203020520a2f4d61726b496e666f203c3c2f54797065202f4d61726b496e666f0a2f4d61726b656420747275653e3e0a2f53747275637454726565526f6f74203135203020520a2f4f75746c696e6573203837203020520a2f566965776572507265666572656e636573203c3c2f54797065202f566965776572507265666572656e6365730a2f446973706c6179446f635469746c6520747275653e3e0a2f4c616e672028656e293e3e0a656e646f626a0a3130332030206f626a0a3c3c2f4c656e677468312035353338300a2f46696c746572202f466c6174654465636f64650a2f4c656e6774682033303438333e3e2073747265616d0a789cecbd097c5355fa3ffc3de7de9b9b3d3749d3a46d9adc346d0a0da5a5852e5068808268655f6c914a2b20082a4b7147a92b8a38a0e3e0328ea2e3828e0ca1540ccb0ca88c8e0b830a830b2a55711dab8c222ed09ef7734ed202a3f37b67fe1f7dfffede8f4fc973b6e72cf739cff39cf55e4000b80920a3f8949a1123a56ba59500f50138eb94716327fef6d3273f01e41d00b59f3271f230f39fd515008903281e3bb1a8e4126f9d15a09700689c5233ba6edcad73bf02223b00e76d33ce6f5a90a78ee804e86b001e9871d162fd3effabff00ec558061d2390b669fffe2a5f5770169ab00c305b39b9a17c0071340aa0068b3cfbbf49c7f98c64c04a64c03ae3a3267e6f9974c9c5eb302a89804048c736635cd6c4f7be61f006907503667ceac2657a95901c80a00b973ce5f7cc9c86fb3d603a6d301f9d079f367344dd856b60230bc04d0cbce6fba6481e1765b0b404e07a05fd074fe2c6f63bfb7006909406a16cc6f5ecc0ab01a20e7f1f4058b662dc8db377a3b9005c0f26700128ca0708230060944b4fc0b54e1775041a1a1085300f931cb9fa18042820096cfcbfc0120803aa46b0c866bf86efd77976922e624822a1163465ff485d2b4a8e96ce8332e5d741ef4d98b66cd833e67d6d98ba09fd7b4f802e8c7cb849271d7a9739fdb33dd51f59531cb28a2ef7f2fbf80bb2f8c1bb4e9bbf59db33518ad004c3d357297c770a0b0a5e224f194665841e040360874e820c8410e0872510882229483a01203415005dee21a3480a0156d2064201924ca96a41bc82a28302a7729a500c94abad2cb3887ba8c0ab51864ca416ee15c3e01468f1d331631e8a15f2b7bbac693527508698df10e60801c51b6f29e822c5a9dcc9996ec19a441c62a919a4cd7d11b033118d5380d937006ea7119d6609d9ea667877ecd4b838e7cf4111443713aa6a01e4d290a7fe856c6d87b3ff03783cd68bfa7fdf6036bffb5ef7e10544ce5ad934d00e6a225e5e71cbe28e5a7b0634eca2f21865e29bf7c028d824cd8537e03ec00866211ce4513cec3684cc214ccc22234e35ccc07978c01e88b7e284613468b98f9588c4bb100b3a0e3549c8f26ccc6b9b800b3a1a310fa09a5e9988059988d0b711e9ab0e85f42c7e91e818e1214a31ffa41c724cc11657fbfb6e1988f455820701316a75ad857d4795eaabe73311b73b018cda9da9bc5d35c84599889be297d28400524a109694213d2840ef01ee7fac6041599376bd105e0e22f429041610411bf0241a9916d6413b98d5c4fce2353c92842f112eec71c9c8d3a8c113f020d12d2908bde28422906a05c487a154ec564d4632aa681c2c1e6c0c9e608df4a38d94a109ccaf6f33e62fbe1e8fa061aab81b3eb1b64b395c8657350c3e66014abc1e9ac0d13580d26b23998c46a50c756a29ead844594a4b1fda2b46cb61fb9ac0d35ac0da3d87e4c60fb3199ed471ddb8f69ec3358e16035d044dd35c8666d27d4b112a78b1c2b3199b5a18eb5611a6b8333d932969dca958d6c962d7295b0fda861d918c9b2318a65a75a982d724f61d9a284a96c25a6b1959051cef6a392edc740b61f556c3fe49e27e64fcbcb3340626d28677350c9e660209b832a3647b44112f5f3ba73d94a1821b19527d0b509ba7ab61f53c553ee07411ae39ac1a9cb53f571f0fcc05f052ec10bfc8fa8a4808c222d74ab34445ea2dc6e58a5ee3029a6332da3acfb6d26f137d436d4b6c5b6c5fe89e373ed2e679df3395791dbe36e4d1b9bf64eda3b9e7ee9eddebdbedb32ca32c764fd3e7b5cf6cbd92f07ded527e813420b4ffe0bfb72fbe44d8834e59fd32bd07b684161342dbaa7707c5fb9e891e287fa6d2859577a67ff48d92965c7cadfafcc1c7468b067c8e5d597fcaff9bb2516896dfbe5af87036fc68e0286134c3eadfcf7469f2cc354fa2896f0df09f48fd247319456620bcf2b3763b2dc8c037233aae4664c919b91998a1b2d37a3496ec6441ea695d8dc5d86fc181609b71953b9ab4c619dca14ac569ec539cab3b8479982fbe5f7b0d65089f39567f100adc47619284fe5596d78147728cfe26e4325662853708fa11275cab3b84f998269f27b284e9609937a3332527ec3ff34b8c9cd384d6ec6f532304e6ec648b919b5b4126eb919c3e4662c23cfe206f22cbb5f0677718de1512ce3f172336a52ee28fa28ae93816a5a895cb919d7c840a6f22c0c32e09081900cf4fa0fc6d95fe0bf003e44d24731913e8a537e61dc2ff003f2315606ee54b62043d9824ce56164c811f800f621c03ee26ed7b9ec239ece5dfa098044ea07acc53a722ed6613b9e2287e0c37a6c461bfe0a2f6a703796e0362c830153f157dc880998000535b88d64b03614e13e48b80fbbe0c519b8125b904e7cec632cc575d21e2cc375b0210743310ef37133399d5d886938205f83729c8e0bb080b4b03af62b762b7b000f62b3f457d6090b32310333b08b7da6bcc6de4421a6e137b81307c8ada6c711c31968c166e9775884bba40699b0d9ec3b4808e162ec828cd1d84576d0284ec72c7c487c6489345c798dfd9ec5d94e48f0a301737017b69001e4141a52a6b1d16c17d251884bd0823bd18a4dd88404fe8437885539c41e608790813e38154bd186bf911d5257e7555dd5dcd0c287dea8c4a9988f3fe359bc44c2e4493a5fb12a254a4cb98ced451afa6132cec0c368c307e46b7a25bd922e959e9147b261b0e33adcc2b98dbfe01d92498ac8583285f6a6f3e93dd22218d147ccd267e25cdc883bf02cde2651b2895ae96ee9f7f21fe4a386ecae7666870111fc16bfc393c4467c4427cde46ab28fbc4787d3e9f4b7f45de936f911f915b5097e9c85f37133fe80af898b5490f1e44c32872c21cbc82de44eb28bbc443ea243e9243a8f7e2ecd91164a7f9287c9c3e48972b37c8d72bd7293e1a3aebaae9d5d2f777dcd4ad8f5188f25b80ab7e037b8076dd88cdd781dafe300de250ab1103bb1139d84c8647239b99c5c496e26f793b5e411d2465e222f9177c9c7e40bf215394a41410d348b86680ecda161ba885e4c6fa377d3dd74377d897e4abf95bc528e149506485552bd345f5a282d935649aba4c7a577e44c79b7cc9412a54459addcabac55fea03ca51c3258d5ab8d30be78ecf79d059d6f77a1eb86aed55dad5d6dec1d7890814cf8114415c6a3094d988b4bb01a0f623df6102bf1914c52408690d3c978329dcc250bc925e46a722db98b3c28dafe47b28dec22af92cf29a88dfa459bfbd20174181d4bc7d2b3e82cba90aea2b7d236ba8f7e27a9924572481ea9403a456a9066498ba54ba5d5525c7a517a4b7a573a221d938e494c36cb4139478ec851f91479ba7ca17c8ffca1fca1324d794179df60369c6fb8de9030fc532d5387a8e3d4f16a83ba52dda4ee353662139ec6e378e244dd27edd255d208e971fc8a96ca19f46ff46f28c474cc9446d36a80ae2537d02b481bcd552e310ca283c8181c9223f436fa0cbd971ea183a4d1a4964cc45cda2f599a214d7e144095fc343ae46d7416fd9bf4382e3158c995f4738315ad44cca3c85fa462392abd8037a4034495efc37ed94cbca4833e2c8d2316f22779885287907437fe282d2457e0713a02301f35ae205132863c8a6598444ac837128344c7a00de5d27bb806f3e86be8c0c5b801b79399f26cfc0aa564093ec443f41ea9b77281a1c0e021cfd173e5e5d44dda40e547f81c8de4124949c3b5a441bacbf0397d1d1762b76cc6dbd263f236ba9bfe511a2d1f52269039381f57e07a2c6457e152a54e7e85cc8644a6204f6ec76d582295c821dc86a558846928c226f8b005090c954663117c08e27432974cc69db80b77e10eb442c625381769380317e06f68334ca209cc56ec64163e04e417ba26602a7b0877b2d9b880dd8a42b617cbd81224b016ef6325d692ebba2ec70204f03ade26a72b23e96e65242ba4cbe9eb74225d7d72ff02248ff8f0093ec11f010c51b662b9fc2a26a29aad607f8707bd90833b71364ec3419c8fcff03e46493b50da35866e6023a505b8543980f1ec61162466cc61e7612cb6e1415541931a45871c27af60132ec72c3a812d9666759d8bdbb012d310c3f5b81037e2c6d8f0c99386c6aa870cae1a34b0b2a27c40ffd2927ec5457d0bfb440b7af7ca8fe4e58673427a3090edcfcaccf079d33d696e975373d86d568bd964540d8a2c51823e23c2231bf578a4312e47c2a34615f270b8498f479a4e88688ceb4d7a7ce4c934719de76b8aeb2753c69af4f839ff42194b52c67a2889a657a1aab08f3e22acc777d584f504993abe2eacc76fae09d7ebf10ee11f2dfcab84df5613ae0f850afbe8fa08df9c1a3d4e1af511f19117cd593ea2b1a6b00fd960310f0f0f9f652eec830d66cbf0f0704b611fc4bde1051b887708111eea1d31700385d156d867443c335c33229e11aee12d884b79239a66c6c78daf1b5193150ad517f68993e133c267c7111e1677440509868b6ae286e1715554a39fcb9f0637e91bfaec58be22a1e1ecc6a875667866d3b4bab8d454cfeb7046e3de704ddc7bd941dff160619fb86b78ddb21353b3a4e5237ce7ea3cb87cf9323dbe667cdd89a9218eebeb7d857d0afbc469dec8c6e523e3b1a615a30afbd44ed4a7d5c5e975f57571725d7d611f9d3f097faae4f3cd0a8fe0318d73f5b8293c2c3c67f9dcc6263d9eb93c8e0997865a3333639b593b3247e8cb27d58543f1eaac707d538d7f431a964fb87463464ccf3839a5b0cf06cd9964ec06bb23e5b1da4ef4ccea49133e41ce7db5137a384b788bc2a7c6638d717d861ec784ba709ce6557034ab02cb6754648538d493c23eb5f199e3eb469c1b370d6f5cae0de4f13c7f5cc9d3c2faf2af10278de18e4f4f8e694ac518f2b4afc0bd5c4e7a442d4e9abafdf168345e50c045441d1e37f0271822c2030afb5c94a0e1f0024d4f50ce3e8cab8b93a6fa8145bec23ea110efe09b12319c5dd827146f195f970ceb383bab15b1a2687d9c36f2941ddd299ec93ca5a53ba5277b633854d8a74dac803d7163a4e79f434b778f9833304ed2ff87e459c9f4da89e1daf153ebf411cb1b53bcad9d745228995ed19396f2c5ddc3eba42c9af2d12c49a4c65dc3a7f510f3409d352ee7c5e53c8310ea9909d538be2e1943f49171ad715412d79b43a1ff3053821de2b984733c5baa99f181d193c3834e0a9fd43ceb72a976525c8ed0da4953972f379f94563b2155e1a929a7498f63525d481f1ec7e4bab8941797f2126c4705ffd567c56393ea78caa4ba3815d1f559a9e0498459297f7d7d7d3d97cec23e23c3231b972f1f19d6472e6f5cde94602d6787752dbc7c337d8a3eb57cc188c66ec149b02d3765c547aea88f6b8d73c8c0c23e1b28866d08931bc66f88911b264eaddbac01fa0d93ea5a29a1c31b87d56fc825378cafdbac0331114b792c8fe4019d07504b6a27d4b552a3a0cfda1c035a44aa2c224478468240c4258936c74030234193715a771cc58c849c8c8b89380edcc60c9f5477a2f40895ac2f04366392d46b63c4177c699bd41bed526f50a9776b343bb859ca97b25b0705630929bcd1e529710c2d94f8494791c0baa463bea463bda463bbc4cf13a64b01be3b2c05b0540aa0450a60bd14c076298097a400df27910222559702982f0570af14403b4f91b2257fab1ed486e64b19582a65f05d63c98bcf252f98e48584a0e44591e4c558c98be992172b252fee95bc30083a1e335ff262a9e4c576c98b43222526795b6f2d8d25246feb4dc2d938f7bc12116c4a06a73588e0c633ea93eee8f149b7e6d424d9c02459bffec9e8bec3926e7e9fa4ebca2b69e1aed956b26368ba948e97a474502c90d241e84e380841106b240fe292075432a46262926b636ea4e4deed920c2251896026826c87445a6dce92a166cae8e77021483fa31dc914dab1d1ee2cb977e869f45daca7ef623b7d17127d97be4bdfa1ef60296de73ca7eda8a6edb897b6633b6dc76eda8ecf693b0cb49db6d303f4007d9bbe0d077d0b45f42d54d3b7309dbe857be95bd84edfc2e7f42da8f42dfa1634fa26b74f02737f357d1394be49df8446f783d0fd743f1cf40d10fa067d83eda07b5acb2b4b360b4fb428e509e6a53cdeac94c7955e92a0afb47edb3bb8598a487e2e515ba51c0c41a994d39ad72f98907cad55e70613f4bd8d7a34b8666831dd8b38ddcb4fafe85e68742f74ba17e3e85e34d2bd5840f7c28046ba0f0be83eb4d07d5845f7610ddd8738ddc7a58cee8346f741a7cf43a72f42a7fb504cf72146f7611cdd07237da9558f061374776b645870683afd1b7d165e04e92eca17e041fa227d46b82fd0bf08f739fa170410a4cfd3675a03410cb5d06700fa2c34fa0c34fa2c8ae85fa0d02737e6ba826ca8936e0741906e4711dd8e6aba1d63e9764ca7dbb1926e87816ea739ad3383aea116ba15cf1b81206dc5c7c27d08f71b119b1b8c45869f5a12d3398a0c1c5c12d3070e2eb957bf37426391d57796c4748e22bfbab524a67314b97645494ce72872d95525319da3c8791795c4748e2233e796c4748e2253a797c4748e22632795c4f4b1934a12f49e2772f383e563e7117da8835e8c627a3162f4628ca31743a617f33f7c2bf3b6fdb6b5a02098a077c5a2bd0b822d5b48cb36d23281b4dc4f5a6691962b49cb55a4a58ab49c455aa2a4c54f5a02a425465ab6920a10b49058db49c1ca988fb43c4f5ad6919666d212212d79a42597b4e8a43c96a0a1d6534b853342381b8772a5a3a18d83879438863a6808d53484a5340409db6908bb69084c846234b451cf49126704b89bb3b1a03a19ee3bb064fed051f4692ca54f63257d1a07e8d39051449f46237d1abbe9d3fce0853e8d6afa34a6d3a7b1833e8dcfe9d360f469187080f283dd95023b680e8a680eaa690ea6d31c2ca539f89ce6c0209af3390d81627eaa89eb45c38a528d1ecb43f469fab4588087682896adf9b5a8364a5ae9278e00191b60015a8ef474002ea7d19920b64d5fdbbef9da06d35013fd155d896c04e9aa94bbb2f5dbec6082dcd11ad91a1cea21b723201304492522240f41528166111e00bf91bbfde1a77f409094b4faa70413c4d11ae913dc42ec3cd7a6e0b7fe83c18ffd094a36053ff26f0dbeaa2764d21afcbb3f41ffb029b8d77f63f0b9a28491b406b7451284b406b7e88274b3bf22b8ee79417a552441ee6a0d5ec99d4dc12bfca704e7f945c2ac64c259cd0999c41cc10991a9c151fe1b8335feb383b1e684916c0a56fbcf0a5625a906f03c9b82c5feadc168d25be09f12eced17958603a2c0c9e5093227d6475dadd6a963d532b544eda386d4a09aad66a96946975133da8d56a3d968341a8cb2911a614c4bb0f658949f75a619c46502be6d4e200bbf4639e687e4dce81123c56988bba55a5a3b7118a98def9881dab3f5f89189e104318f9f1a57c2c348dc558bda49c3e215d1da84ca26c4cba3b57175dc99751b08f9557dbc221aa737240826d52508e351d765f175c16610e2bceee62ceef6baeee6fa7af8d22faaf655bb86382b47d6fc006a4ce1e871f09de4cf8eafae9d58177f34bb3e5ec23d2cbbbe36fe6bbe70d84cbe208746d46c26ffe44e7ddd666908f962c4041e2f0da9a9afaf4d9029820e3af9e7889acd8870a7be6eb331009dd341370692747725e9f2c8179c2e973bf5759b4d26e409ba3c9349d0c984d36d68ce1d51b3213757d07875340b9a66af7e22cdf379236a36e4e5099af4163c2f689e4f6fe134f12182c4ef1f51b321e0172424137e41e227998264ca7192a214c98d3d24378a9a24729c86a3fabacdb6f66e1a5b7b4d7d7df43f8559c3a251b27150fd8c697cd1d5181e31ab313ca2317ed345737cf196b3757dc38cfad46a2cd278f68c39dc6d9a15af0fcfaa89cf08d7e81b064dfb81e4693c7950b86603a68d9854b7615a6c564deba0d8a011e1a69afa8da78ceb5f7e525d37f6d4d57fdc0f14368e17d69fd7754af90f2497f3e453785de5bcae725ed729b153445d10323eae6e8311c3ea874f4bba1ba9c5ec1a5ed79815aa1f96ae2d1822847750c87765d61619642d2cd1fab8353c2c6e0b0f134985430b87f2241922c9ce57d6a924df958342595bc8da5492161e1677868721baf8c2e60be11b716e4df25f737373f3e20b9b175fc8199ec4d1e67f07d16874443cd654d3bc18a88d174cac8d578f9f5ab7415547c4638dfc91e203bbe32c961109b62319d977626d7c208f94a41e421e57c5e34ca614e1f7fb3fd99a687438d78216ba75238905c86234d74bf140ed241a77d54e4a2d61b6e05e313c34d723bab89944096f6acfb3080f9261f067eefe2dbe30e54bf16271ca4de68c22dadccd921ee0cc1248242c8e46c586950489705024895042e0533eb5ecc0374606238cac0b26985827cc308bfd7e0beb841556d6091b6cac1376811db0b34e6870b04e38e160c7e082931d831b2e760c6970b363f0c0cd8e221d69ec28bcf0b0a3f0c1c3be4306bcec283291c1be431632d977f00b9c8d2cf61d02f0b36f1114584736fb162104d9b7c881cebe45183afb06b908b16f90871cf60d22c8615f231f61f6357a21977d8dde88b0af51207014f9ec08faa0173b824281fba2801d4111a2ec088a51c88ea01f0ad95728415ff6154a51c4be427f14b3c318207019fab1c32847293b8c0af4675fa252e08118c0bec42081ab50c6bec46094b32f310415ec4b54a3927d811806b22f301483d81718862af60586a38afd133518ccfe891118c2fe8991a86687700a62ec104661283b8453318c1dc26902d762383b84d351c30e613446b2cf3146e0b138857d8e7118c53ec7789cca3ec3048127e234f61926a19675603246b30e4c11f80c8c611da8c358f629ea318e7d8aa918c73a7026c6b34f310d13d9a768c024f629ce12783a26b37fa01153d83fd08433d83f7036ce609f6006ead9279889a9ec13ccc299ec139c8369ec63cc16780e1ad8c7381767b18f30178dec63cc13f83c34b18f713ece661fe102cc601f61bec00b30937d888598c53ec422cc661fa259e0c598c33ec08538977d808b30977d808b3197bd8f4b308fbd8f4b713e7b1f97e102f63e2e177809e6b3f7710516b0f7712516b283582a700b9ad9415c85c5ec20aec6858cef635fc4dec3b5025f878bd9bbb81e97b077b10c97b27771032e63efe2465ccedec1722c61efe0265cc1dec50a5cc1dec1cdb892bd835f61297b072b71157b07ab70156bc72db89ab5e3565cc3daf16b5ccb0ee036817f83ebd801acc6327600b7e306d68e3b70033b803b71233b80bbb09cbd8ddfe226f636eec60af6367e27f03df8157b1bf762257b1b6bb08abd8dfbb08abd85fb710b7b0bbfc7adec2d3c805fb3b7f0206e636fe221fc86edc7c358cdf6632d6e67fbf188c08fe20eb61f7fc09d6c3f1ec36fd97eac13f88fb89bedc77afc8eed471cf7b0fdd8807bd81b68c5bdec0d6cc41af606da703f7b1d8fe3f7ec356c12f8093cc05e43020fb2d7b0190fb1d7b045e0ad58cb5ec3363cc25ec59ff0287b157f16783bfec05ec50e3cc65ec59358c75ec553f8237b154f633ddb879d88b37df80b36b0bfe319819f452bfb3bfe8a8d6c2f9e431bdb8be7f138db8b17b089edc58b7882edc52e24d85efc0d9bd95eec16f8256c617bf132b6b1bd78057f627bb0077f62af602ffecc5ec1dfb19dbd827dd8c15ec6ab02bf86a7d8cb781d4fb397f10676b297b15fe037f117f632dec233ec65bc8d67d94b3820703b9e63bbf10e9e67bbf12e5e60bbf19ec007f122db8df7b18bedc607f81bdb8d0ff112fb1b3e12f863bcccfe864ff00adb857f600fdb854f05eec05eb60b9f611f7b119fe355f6220e09fc4fbcc65ec417789dbd882ff1067b118705fe0a6fb21770046fb117f035de662fe01bbccd9ec7b738c09ec7776867cfe328de61cfe398c09d788f3d872e1c64cf81e17df6dc2f36fdff039bfecfffe536fd1fffb14dfff8dfd8f48fbf67d33ffa3736fdc3efd9f40ffe039b7eb0c7a62f3ac9a6bff76f6cfa7bc2a6bff73d9bfeaeb0e9ef9e60d3df1536fd5d61d3df3dc1a6bff33d9bcecf2139e636bdfd7fa14d7ffdff924ddffb8b4dffc5a6ff324fffc5a6ff8736fddfcdd37fb1e9bfd8f41f9ea7fff5ff07f374f0bba02466b1187bdedda2b20c48b224197a40e237e60d30aaaa6a301855aac060548d06a3aa1a60348b5bc8e28e1807d960a054a1c6a45f3218cc06c3ff78f7fcff142cbc9d3f03b01800abd5f47dfea93d20f1d7c754a84693c9a89a4c9201aac9641221a816a8a99254d5a0aa92aa4a9241b2f07cb22aa98a4951949fa2ddd69f09ffac06c06633f3f75a8ff34f9665f938ff647e9359858983d12cf86731994d66934985c9c65f431590e435e79fdacd3f59554caadacde01f156c3f13fed954c0e1b0f4f04fe2e2222bb26cec0199bf2e6a84c96cb1984d16b3a4c268315bcdfc261e4c8e1efe25698d46ce3f1bf72b46d9a85a54b55bc17f5470fc3462fd5f83c308689af5fbfc33f580e09f09168bd56a315b2d9211269bc56ab15a2c26588ef34fa8b46c32ca9251b2194d265337ff7e12f9d37e26fcd38c80d369e377df0548dcdc2b064539ce3f85bff8799c7f8ae944fe3961499594a4359904ffb8df60944daa4535fd24f2e7fc6986a5ff1a9c26c0edb6f7f04feee69fa50714f0e310d86c76bbcdeab019ccb0386c0e1bbf4c0b9bbbe7e56fb3c56cb1182c665936c99ad962b118cc8ad9c439f953b4dbfdd388f57f0d6e33e0f1687c8a2240e6ed32a80683b507f8080d2b6c7687c36ed3ec060bac4ebb66d71c762b6c1ef11a3607abc562b11a2c164536cb1a974ed562b0581c66cb4fc23fcfcf847f1e0be0f3b9f8144580623402aa51556d3da0821fbec1a1399d9ac3ed3470a973ba35b753b3c3e185962ac966b7da6daaddae18ac8634bbcd6e375a55bbc569b1760be88f0a3edece9f01f8ac40963f2df9321ee71f5737a3c96874f4001f61e080cb9596e6727adc461b1c5eb7c7e949736970fae14a95e470d81d0ed5e13018ec86749ecf64373a6c6eab3df94d871f19b27e1ab3f05f43961dc80ea4f7f0cf603603fc728cd6037c848106b7dbe371bbbc1ed501cdebf1babd1eb71bee00dca99234cda169464d5355bb9ac1f3991d46cde6b1d9ba15fc47856cdece9f01643b005df7f1298a0083c502982c2693ab07f80803173c1eafd79396e13569706579333c195e8f1b1e1d9e54494ea7e6749a9d2e55d5d42c97d3e9b4682697c36b77387e8a76ebbc9d3f03d035209493f11ff02f3ddde74b4fcbf4999c7065f932d3337de91ea4e71ce79fcbe9729a5dddfc73b92c4ece3f87a3db40fea810fa99f02fe404f2227e3ec513a072736fb69acd9e1e3003e9fc75bb8cacac0c6f7696c90d4f302b3b233b2bc38b8c08bca992d23c6e4f9ad9e3514d6e35c8f3595d668f33cbe9ec36903f2ae4fd34c3d27f0d796ea0a040eff9868fd16e07ac76abd5db0356f0ab2bf0fb03017f662860f5c01b0e84fca1803f13fe02f8532579bd1eafd7e6f59acd1e732ecf674fb37abdd9e99e6e01fd51a180b7f36700051ea06fdf30525f3e82899b2b9bc366cbec011bff0e542682c15028e8cf0d59bdc8cc0be5067343413f827d1148959499e9cdccb467669acd5e7384e773786d99de90d7db2da03f2af4fd69ccea7f0d7dbd404949844ff104989d4ec0eeb4dbfd3dc04768f8110ae5e68682f9b9f60cf87be7e687f2734341844a104a95e4f767f8fd76bfdf6aceb0f6e2f99c19767f46d89721be41f16343096fe7cf004a3280b2b2de40aa3bcd2e17e070391c811ee0233402c8cdcdcfcf0d15e43bb21028cc2fc82dc8cf0d21b70ce1544981405620e00864db6c59b6c2ec4020e0ca726467e5676665fe14ed2ee3edfc194059163070601f3e45166071bb01cdad697a0f68e097f0909f5f50901f2e2c7064432f2a28cc2f2cc8cf45fe40445225e97ab6ae6bba6eb3056cfd783e77b6a667f7f667751bc81f1506f276fe0c606036307c78099fa208b0f1bbf9ee74b73baf07dc403ef25058585c5cd8bb7fb13b0779e5c5fd0bfb1717f646e13014a64acacbcbc9cb73e7e5391c398e4a9e2f3dc79d172ad243dd0afea3c270f10ec1ff7d189e03d4d656f0af5109b07373e5c9f0780a7ac003f441014a4acaca4afa0e2cf3445030b86c60c9c0b2924294d422f58a3c0a0a2205059e8202a733e2ace6f932229e82bc01b979793f45bb6b7f1ab3fa5f436d0498387108baa7719adf0f78fd5e6fdf1ef002c5e88bf2f2aaaaf2d2a155de02f41d5135b47c6855797f944f4459aaa4be7d0bfaf6f5f5edeb72475da7f07cfe026fdfde830af27f92ef064de4edfc19c0c40260dab41140cacabb82412033989959da039940194a3178f0b061832b460dcbec8bd2da61a3068f1a36b81283cfc4e05449a5a57d4b4bb3fa97a6798ad246979696f60ff6cd2c2d1c5a58d8ade03f2a4ce3edfc19c0b4bec0cc99b5e89e06bbb9b9f287fcfe8a1ef003035181e1c3478d1a3e78cc287f092a268e1a337ccca8e143307c0686a54aaaa828a9a8c82eaf484f2f499f545151511e2af157f43ba55fbf6e05ff5161e64f6356ff6b9859c20fddc4c747f916b4c4f70143ce90332fe40cf14f2f1ed3a51dc7620a8e42e71f9725982a6d24f9ca162888c43c5024a27c46215da593558492b986850ffba2da91860e547710a7abb2b25fb15b1a50ea916ee8bbab58da485c5f7dd5f5190896748da78dca1e68181c33e73b0834976ad4b40429dd887bedc604298d39d57bed6741d2245d92a4c79cbf5b210aee3cd2a11de94075557555bf62d24022d4d9bfbcacbcd4a01a54834723e4c06ffe367aeab6ab2ecd1f1c8e9268d7f86de41b62ffec8dcea32fd52f5fbdf54f5dc12efda4fa67c5acbd682f8d9acc1a81cbc45b60be57220952da867ba5b3ec0976a84dd3e8647b827dd3e67008cfc1369b4d783e8d39cc663ad9610fdaa9fd3157aa8dfc15887f69a73b0c67fffc487e24bf34dd9beed168e755241acd199c7fd955dba68ededd359eb49377b66d5ebd7cea2b473bdff8aceb8b2efeb5cb47bbde26d76017cc18f3b85982fa0743828c8b458854452931932a98a944a42a182ad48163311df3b1146ba0608de5be3b7c51ed70c3e1835a479556856a8eb50ead53744abfe2d201a59e34839a5f5656be69d7b8334a2acba45dbb16de14199dd17426088692049d4bcf87843eb18c057481444793d194923068a6b2000419f2829b7dd131dac106ed03148deee8578c85a4c13d20e4194a7b93c4e38f7349d922bea0b70b12f2623eca1b5b956ce27ac86b40b04616ad3cd220a425d9a82dbb76ed122fbab10f69a5b20712266e86c4de6e4daba409f6764c4fabbc5d2254ba575a2f51e92290348050febd5bb3f411e84724411e791c90375ee68b6a55dae10e2dd907cb94bed1862bb49dbc2fa2510f2925e491555d7519caa7dfa5f12fd04e661fca4e650734645347cce6b05aadc3263bac16cbb0c98604fb28e6e461c5c7c3aac671168fb5705f922a2bc10ec7d26db66193fd068e1d568e558de30d94bfd61e33670664252d60b3794d09f6919025ee89657061323961e53148b75ae96458791c8aa2d1e8aea2687417aa3b3887b23618be5fd2e13687c3c04bfaa0cd66139ecf6219168b8117a9f11868562bc73caea7c8e365b619f40ccd9f60875aa96ef9336b473a6b878bb5c3c1da636364c3327a83e506c77376c5a45a7c7484fb74cf6919c3b326b9a779a6654cc89aa7ceb3cc709fe79997d1987529bdd87091e532c732c31dea6aed39df1b749f619f65bf23b3a7b9bcb59c93de04fba28db3cd9b60dfc4d23893bccda65828dcbfd84460d24c543c18a7102cf2730ad3aaa053f48bd3ce139c461ee96c4682ed88e9a1707f1dfcbb028202464e0141815581676fe272168d461ba21dd1a8f0362c14de141348c34234408c16a4a2a2e284d7ef108dba35575969497abacba3514338273fe2d6d24b4bca9c5a249ca31a26cfdbb3e6a2d6c5c3e6eeb96fefa5b76c7e64c992471eb972c9690d740f91c9e0c7a66fec626f7475753dbdee8e27c8efba6efffc109943e67e76eef55cca0f00f4a8b20366bc11ab31275b2eb0593c210436279f4260296673f69f272fa52be99d46f93199986050a86452889592e7cd821566ce45106ee512ac5dd82e24d82731a7102fbf102fbb10af043b14cbe0c2d32d21425a32ad4acce6e8aff0b2ecbc2c85e84a4ca14a86650ba922d721a9f80b937c14d0b0305a35bab30ad5d5de4ae2ace4fc44439424134361a7c1a00e282b2b2fa547db86ee9974fbbb458be5cb872c09fef194e7a78b6f4f4356951d0850df66a8ec232121466e6e85ba715de11e1123942ac10e6f147a95d4069353b3f9dc6ec3641b9719a753783e8b9934cd30d9164853025c82bc9c2010e0a901bf5d334c0e58f9d30612746bcc4acd5eaf1ed49c94ea41a7abb268ef2e8e77a1888b48b49ae39d255cfd684f8556978b8a0a6326879376d7d31eb3b8dc7472208dc7f1b25ba9d99b7c00ca65fdd398e0fc0fd5c63592d7c76b1395c5ca0629830c5b95ed86adeab3c6e7fceaa9d67aeb24fb3ceb4cfb65aecbdc37bab6b9decf7c3feb50a675bbe50937cdd2fc5ab616d00c7f6687a0b27618d92198d8a15866c0ac190d86e7fd99697e7fa6d19f29116accf44bb68096a00f6c1ceb24ce04f13dce9f00bcc91b09b59abb15d5dcada866aea8c29a999bbd7bf8adb150b83fd94aaf820e8d54c4accec7abe9743a9f2ea532dd427311242b3708b56b38dca11d89725b2cf4adaab3aabaa3b3e1a0d3c565c5e5ad5c66ef1bb55fa1ed4c8e4ce8d6c10a34908645294dccf38422e56565e5656503fa47c23962e42a2d49f7a419f851af2aabc7caa937eff7777dbef6cecbafbe9b6c767ff3f29e23a31e7eeafe698175eb8656cdd871e5cef7cf99f7ebbb97bb77bffec9baba47b73d7043533fae8153d80772bab20351d2b649f20923cfbbabdb9314b364af5b327c31de793e3f08d78da8d5462793de61b3cd617504cce6de9e805f0ef4f62bbd6d619bd59741e0d235ae6dba1a1165dae8e4481137bebb8af81f5c95d5d55a87d6e1aa2cea78467bc655a9ed8c96f01feffc5e8a2ddd36c276bd4d1ee13cc37951963421fd3c6d6edaccf40b6d97a65d6f5b9e7663d68336b3a24b42e82c569b5d5649d86625bc4ff93757b612fe2d421b19d066b57a64df16fa0032e89c98c913f02b72a0b7cdd5ddc5aeee2e76f5d86257f3747dbe4e751f5711bd45ed2655bb49d51e52b53922cc768420a2456824c10e3fc173455615fa12a4a235630fd9422a00b62366e9b1d1abfa24c8ad29e9887608f948d9e3c3d1861eb3dc7990eb4587268425292bfd8a494505372e64613d372feef2746e8a8550a8e53dde6ef9e002a2728c704e644a5bf037f396aebfff8ad2d3d35c96e6c4f573cf5d91d616fae48f973c3fef9c9957afeafa68df938c5ce3bb7359fcea25f7a5dd432fb962c6d5d75eab3ffeececd699d3efee1bf8d3af76747df5019f2d6402b2a66c811936f2c46658d977b1c7387f6c062138c284f30b08c3269b92e65c6045987383c0a6a4691758350a8327b02a062ea3c0aa30f9468115810d029b044e0e0bae3aeb1ceb5dd647accf5995d3a5d36db7c9928b5023ac064955cc164985d56ab33d2fc96992244b3650ab4d56a5ad742bffff10c89a9819b20cab15cf9be5043de7094531c7b283fdcddd03873939ab109ecfc4f4c29c20e5319b1acb09f7575b4203d4550eca95c1624beb0faa519d4a9467e67968821ddcc4f3d0c7ed09b242f4f7a77c0ce6e3c661aed655da079a1836b4c35547aa9c95bc932b2b97f58dca57683b1d0e47bf62225e6bb6b1b75b5d95b604db1bb394564a398595929c9d5dc58ba86f40c3f06975b1346bcc52696d1957698d452aad39fe4a6bacb052d80e2128ff0a88869ca101a4d459ea093b2527a1ab3bafa5bffbf533cfb4750d20d31f94361d3bedc1aefba84c7fd3398fdb093e3f0c290f21408ec5dc6ed19d2e812dc26888498a85fb8e1b919897fbdc6276e8125812f34731f9e39e2411f7b9c564d125b0c527fa9b1389ce3ed90a6d06613b6236ce5ee2b79b031e8fdfc587308b4396037e9b9d40f525d8276272293cc262f1c1855b1cae55aecaa2ce9ddace283732bd7995063157354caecdbc347b79f66af7c3eea7adfbacfbb38c26b7cf5e9029998a9562cb16d60e89b5c734b7d9e372bb9fb73bd2ecee34bbc396a00fc4dcbc2131fb1a3bb5db1d310f4935ea09874cf670539420be989337cf395d9baf2dd5566ab2f6ff62547cc2a8f8087c9a8ffaba8d8a6f95eeda4606c0417e031ba968b53ffe43c62578b27139c9bc34f0b55067c341c1870667655183d6a11d5c66ec1b55aed076420c4162f4210b1ba2d1efbd6e7fa2bd31a8f9ee902724959596c093a61ac23991c97ff2dc79ded56deb569cb1a2d723bfa2af773e31f6da5b7610e3e29b0fffb593b468cb6fda79ff5dad63abd3e93f1febba685ad791979fbda5b59d5b94d1ec43d9a3ec40360aa8b4192e7648f0c6994879f46e6e19bb3df9dd6214ee11a350727d22b05d0893a0169683cf54ccc92589f5f89816749020994e2492d52b10b3119b2d4d0964293981349b394090a7f15c6279a205bc1a9729af18d1bc6279e24dad2576eddda5fda55bb61a3ab49d0d5cb60ae765901a35e6a9c9a8d1a7ba26e9f3a499ea4ce35cd74c7db1f142ff75c6ebfdfb8c7bd39daace3b363f69330cfc61da6316ee0b89049527e4eb613dc4139cbc95e36cd4664bcb227bf8dc31c187b4ee36133ee0e0f1bc6e16e5754b565e8f64e5356b42b234024dd3a89660879ee0735f6d551f738254c4dc01a1d501619803c2c40612a4329653ed9dee9def5dea95bd62f9e7155cf4a6f3bcde74de526f82e66e8cf6ac3492e3d889a2c717b9a9990f67534ace38291fd04eb4528846891ac917cb0b83ca4732179fe98473e0d4caf9b846d24e1043e9e8465f9f53e74d193af96c3a74dbecb6ce8b5fbaf69dae83bfbbf1a3756f75968ffdd598450fdc7ff9658fca13ed738b47170ff9eccd198d5d5fbfb2bce34a524b9690479e5cfbd4b1b71a1ead4fdc73c7faf5206802e474e561d8b02066df6923b28dc8d4289b241bb8a129a64436596dcd92443923c78a399f44331dc666d33f30964c27d3a9544da693f964299149863da58c63b4c30d0bab461fee18a31de1ab05be2ee773c14aa730fafd8ac942b17f60806450c3652e577993f4f88aae8eda32c766e9ea2f6f94bf5bb7e2375daeaea389fdebc827e4d9bbf95ed544f6a19ca1ec801761144b2337c3dfbd54cf1466581558ef59c0e7887091c085ddf3bcde3db63b729c5cacec738426f97bc29922cce98554f112624eee2b1209118193d9b9e0e4084b9eccce7d99222cb2738fc82e66d445222122705231dbacc80af4e503abd7eda693fbf675850206a557c0650bf01985d83838bc49ec1b441ddc4670dd74742f34b847243a7c52f7f695d44d25f5e8b494ebb172728f28d12374da737c7fe0e4cd07be42e9e0db79a93d882744430cdd0d31241b7250ec45708f884bd5cfe3a4043b16cbe191bc5a9e9357c8317fd2e3cfd75d5947652511c3d6093f6e56ca07a493dee9a7a69f1af9c0fa71b1622a2657e00ab2445e6c5c685964bdd07699f7262c272be4eb8d5759aeb55e6fbbd9fba2f319b72b27c1da5bfd7a267774bd883b857a84db948cdeba15011fac5981be6bfa921338dd6d4602dd6624c0cd8830a281e6ed2662da4267239a228a7613457b6c4db4d911d3c3fd8b1d040ecd411d09724b2ca3c4270c8c4f18189f3030bee6b844a4049d1df3e48ac45c91982b12739b3ddd0b71dd13f350cfaa7e491b93dcca382ccc0cd7ad1382291e36082626376185ad11e35ac3a2855858ff8393a22490486440ffd4eaaa7bf28c01fdcbdc6927d89c130d1099bbe0bc0fb6eff864def9cb6eee3af2faeb5d476e39fbfa7973aebbf19cd9370c3c75d5c4abd6aebb7ae9c35256ef3be6ae79e3c09a736eefdd67e70ddb1808d9b1f2493269ceb5d74c9fb1ecda636cf4aab10fb55cfde8daeefd38aed90114d0359be1601fc5c29c1d1ea1241ea1a8f90287939a2e1817ea51e5744dccc179389bfb3c4237f3050e27874931254be6e0be7461d7798eb6e309bcb274a1a33ce1844d87272c411f419ed3976047847cf3398a18c17c7c57a51717709f5348b8536cae387dce3e514baf00df2a1e6b97ecf6348c23442c246d9ad33099f0f9510e5f83f3cedb196d2811a34489e8bfa268946ba3c647dab7fed2b3117142238ecff8620562cac777cae8bfabf5e4bafea5aaa2132b8af51f98797a7a2c7c66fa19e173a4f3d2cfcf9c1dbe2cf38ac08acc9b0277a53f92b92df393f40ff423ba7b70fa3de9ebd2a581bd671a683e9f2d86597bcc17d20d7aafc058fb743e35f4f32ac99e71c961bb8d3722d8ad63c16ef50976eff204b7904a5852c916ce669e6ce94eb6f0d1da79f23471551f3e038879f1789e10873ca14779428ff29a9d3d7ae48c39a97355f4243dead08ea47428a5413d93c4ee911a0d0b49c30f7e982b392b1c4207f4cfe7a3341dd01fa525e92ea7d82e8c10a1241ea13d0bd6a52f699a78c5b83252b6f5fc4dc788faccca8ecb2ffbe7fd8fbd415f7870f125ad8f2cb9e23e3251bbec82d397beb6c0ea9b328f185f3b40b4bbbadeebfaa2ebc3ae8d7fdc2ef5ffeda69d77af58bf9e6bc966805c2f47c4a94d454c97151854133554c9521531c8665a55846a50be13789f317522b0908fbb1d5af27026793ec38f6706947a36efdab54baadfb5ebd8c3bb76816211b94f1e281b44d9a7c4f21503915513f224922751354f960d79c594dc4b77534ab72bc834910ce31953c5d660f248a06161073f71a8127555563a85150a0de0cbae903cf05885f457fe93ce5adbf95ba1f15301d9aaec410039b83656b422f3a62cba247349163d3b7356169d676db2d3a9d649765a66afb1d3ac0ca32a43cb773a61eb9d460248d0f5b170282754153407ab7272f4aa502880b3021798cff2cecdd5ced29dc43937ccdbc7cfa6b4237c5150c58f463ac5d1c8912ad1d5079d6287a1a1a1a1010d0d2432809f2cf16e3dbea52073a368a72a6718798d04d2fbe56ead78e0e2e6bb7c9b33be7ee15582a9d7d49565d2c42e726eae6beee88183a20f9e3df0dc7b57dd99beeb8d4f1e6abc7ff198d31acfebba9d739875024abdb2052aec349b2fecbee9de723b263c262eeba9d564d223f3b1c57b7cb7c02027f70c5244df252d99d1c0b1ccc77911a6c2d2111e1e2a6c9c59d8bf74b1c52cd22c62dfc26c16e5086cb28bf2855f157e627768624dff455bcac315d1c03d8763f5622a208675befb61985ca4156bb38d734c8dda0dd22aed39e519c30eed9066312af5640a1da7cdb1c4b52fad5fdabeb49b64ab6c93ed92c56c5264d96ab31b0daa6a3529b2d1605509c09fd821f6ac75d59aa6aa562a493ccec3e3245db6a6c9b2d514501463c02019127441cc04a3f5e31825946e2116106289b9ac3a66a9d28471f26ef9802cad92899c2024661967dda11eb04aabacc4cac39a43ddadd2a56a8b4ad55f3bf6bd9ad4978cc30d0b0f372cf475681d99195a47077cd555991dd50785f874f073a5e815dace657d7dc2156ae5acac5ca6eddc69dfb973999274fb1593dab865626d3c307e6a5d9bec908cea16760860df70cb524f16f1d5e6bf87302925612924b9435224dfa04ab4f4655af7d61f3a7f7bdfebe49f778eccf1972a5bbe1b49b675d5d0a964f5e68b6fbe89cf8e5703f2c7ca1638f9aa925cb719323b1cebcd4f81647964784af89c70b3e95a93e1dccc0b9505a666cb35ca3516437eba49f2e51704d2b3c53645f7dec6f193982cb1296172bb020505bd7bc39f1da084060301278cbe04eb12397cddc69c8f8e311b5f29f922062b9f861a12ec83581e1fab0c2e3e4ef1f774e8648391b78aef9819261bd2b8541926e5759776e22aee48cccd4bcb8b58fdbc34ab999761e51298cf4bb066f6c90ed0131670664e1dd0c561889e3a09e1e375ca933a05f9ae4d0858d263489e8b98c559484374d0b4ee055d34da50d5c937adc688f0e8e47665128e6f6d577556b92a8baab4ce2a3e6a479d957ceb32b973c9cf444a9da113b625ed344c4225c95ded4838e40c9524cd4d241c5a4d236b5f683e67f6752bcf68797245d7afc9e0ab2a4eab1d79f53d5dfbc9f96745864f1d38e9372bbad6295bea37cf3aeba1d2fc6d2db33734f6932638d3cf197deafcde47d7a8d68a7923275c2a76b9cf611f2a17297b908dcf1f9f41e7665392ec53f1ac1fc5a6739f8e12db0c2cc0e2ec165c9bbd0a77297f901eb46d96da6ccfda5ec2c1ec2fb39d7657b6333b5b2a30f47216f8f5e029b629696778a664cc51e6655feebac9759774a7fd2eff5af2005debfcbbdd8d34646a695aa6cc0f6e5b7b558ab9ce885e959a0344ce7207ac525640366911c76988e88490cca057749d57749d57749d37a21b89d1cabd462b6fa5312330639a584d46a30da20bc668471a4677a456d749031e8d36f0f3bc68942c225e831ccec9a503fabb724b4b64af1ae1b69c7ad25c7c3896db9e1adcf5f4fb1d5daffe763d19fed49ba4cfa0eda54ffdfa91f7a69dffc1f5bf7f97d27e9f1f7d925cf0cafb64f286f6170ad7dc7a7fd7e7b76cedfa78f9363e62dd032853952dfcff57251931971e24c38d497d706a01078cde6e093ef1b4f3482c27f560261214e70926219826b3380ff6891821d0c2a46606b335c10f4dac3b3431afd1fe6381feba5ba0bfe916e8c00f08742ad8709214f72b1e7e69ac4ccae26ffaf337596543862fd3470dfcd5619b593278d2d3d2dde992214bf28688cbee0d119fd11f22e9666788ef5f44a3fc0adc55a4814bbc37dd9beef2a4513b0de7854a52c738f99170e81ef2ed1fa65e59bfb879cc65b7ecbaae6b03a9bce5c17e2346df7ede98755d2f2a5b3cd9a79fddb57be7c35d5d8f3495ac2beb37e2e3873ef8ba807fbffd7e40e6ff6f95056d318f4109188daa0a49e6cc379b021618552e6d459aabbf3a493a4d37eb366aceb4c9262161c9cd77939030d37f611c4ca67f6325ac83ce4cc9648aada3bb0d45c3e8c307bf6719fa15973a439e50ea77bf9c7bec1e297aecefd2b5ca96755dd58f75d9d681602d205fa76c8109f7c7068b275ca9929e878451bd5ba7ba85d24ccbffd153f16512bf679032025ddf7b263317947ff34c07937b377c76fcafcfb3567aebd8fb34de398e3fcbc0759de770fb733efb50d9acec411e1913cbcc4acbf2d0c67c7296d14d5c526e2e422e2fcd43801ba51d7c5c374c26c4e00dd8a550c0602224929f97dbad49b9dd9a94cb3549ecc1e5ea92a4533dbf519c3cf00d88d42c257504f186e83f314b29e565d3452df9243f5bb02c5bb02c5bb02c3ba29b8959981ab358b199332233ce3cc9d48cd61a925b7b55a335c10cbe93d7b33b52d5c9c3c993aa4abea335fcd2588d1ccef267fa33fc92c11ad1f23c9160c4982747c2793e5b7608e90e7788385d696e5dcd0e2147c90b11bfc51b22694e6f88044ca11072257e4d4caccaa3fc3e8b38f210c0550b0d64409ef3240397ee55fbd2700e3f16f5a4b9e4d292b272a7743a3d7f65d74b6b5eebbab76d2319b7ff5e426e8dac0f9dbd69fe754f5d1caa5846e82d571e1a42ab1f239ded8b9a3793b35edb479adb66276e2b5ed0327afcb5636fb87767d7372d4de5c4c9fbf20140c9e19a47acfc6066472cddede92f4b0193798df92533352b945af8b703babbccd8dd6546de652661ca755535f00325310f48b02ff8429b4e3688bd6503df942910f30122e6030d2d3662a316d16116d16116d16196a48c8b2b0f6e4fffff40d8c52ce364ab28b66ed160d56d44b78db335da16d8e441f5be68c3c29ecb0d3d5632d9f9d1aa64df8b6b45950d45c2549268a9b3d41972963ac3ce90f381a7e8774f3dd56950b6743e44a77e37926eec1c0d82ed00b94ad90289e4c432a8781e4960aa8ad3218149827d2bd88504fb36b9bb4815feb892c024c18eb6710f12ec684cf0811b03ca6f6b6cac182c6e6d6c2ced9f740b8b936eafde49379c9774b30349d79799bce55160d3faebca2a65bd22493a0156620de2908b10c3381cc021282e1d2bb10a9220179d055f8add9f76b39b9f0f26f91e131dc95ff1334cc6fdf2befa13469ce1d3ea5a5b404843fdc245559d3db35e7e082846ee6ee0fcdcfe149fd682a09c7d28358999ecfb316d169d6d584c2f34dc60bbc1693009abd166e146234132dbe480c364ea163d53b7e8997a44cf14319b7f58343709c98c58f85e0a7f34e1e14f6449920b4f72d2c4636262ebdfd2a0bb89ee8eb9c7b91bddb29b44f87caa7bc0f8a45bccde4cd9d45ad7a66e5674680d0b932ce186a54a4b6d3a7444abfb15a32175cc5436c059ea141bff9141ebd505334e9ddbeba9fa27af7e721759e35bbb6478f395d217c73212cfcf7d9beb259fed17887b9957c7ac84ca52408151e74b1dfa702ca4d2a4a8494281242138d27f3cf41df9de34c2f043d3880f1a92231d1f0ff888b0fa29fa8ab2e5bb2fd7f1f6dd01181cca16689237663516586cc3265381bb0f368dec48524f8d769b5358eccfdab847e197797a719fd5c593158755328150a3c96287d144cd1683e82f2dd559df6d129da5819f5da79e2d7973137c657dd2c53abeb95dbd6387f6d24b3bf8f58268342983e8be68175485101b04960496055604e602140b731f5f631b264b0631c2d88faf86f9c9bf38c54a2e96f91da65850dc8f50885537bbfa3b0452ac1288dd02a3915071d4ce4b131e51c8563a052e68744acc961ab14545e2c1447ff0adf2e8e1a2c362fe565d55957c988613342af965efacd8525087318d6619e58bacd75bff6a954cd653ada73aa4de729ead8fbd4e3a53bec876897d99cd68a18ab1d256661f4b6ba51a35661c6d1b6637df41ef9456abab8d6ba58755838b3aecf66285a6290a355a6db662c598a62846eb04c7041223941a8dfc9333fcb3151aefa746578b8bbab6d0b5b0917ead8a6e4c907eb174abc92cb623929b0f663d665d6a21962d740aecc4d2aae834412cad0e6ee6931b80c2be882d5ee88e051ad11274ca13bad2a8b4289292a06b373ab9f9cee0775f1baa7c9d42b7f8bafd704355e609c1830df0555757f15bb13d7f995a8758cf2fbb422ce7975db1b35f318e2fdbff042b3b0a23db07caf689557b6ddc3ab136de6bfc547145e19b0d76338f4ddd58d8bb295469ef1312b716369557da4bca85f7f1c24a7b9fd4cd8468fda2850d58d8c0b715c14d5e88a47bcbca49c81976923071de4172c999c5e91903c874a26ced9ab2beab4ed972f48b5b468dfbad74ecbb91f20b4707c8ed4775ae5d77034a90cf16c9b6d43d2663827df4b8b8a760e91e228d3e6bba3800e29be2e974b2914a92ae1ad354d5485549329a644a4daa5196c420c3ad45b781e431319388fa7f2afb12f028ab73ff73ceb7efcbec4b32936466b24c3040268481483e91458c6c62906d14aba86c4a10111415ea825b15ed756b6bc1a52eb5bd048810d15e538bb66e17daba545a95b6a8684be55acaad6266fecf79bf6fc2a0edf3dc7ff2e4cc3bf3cd9673def3aebff73d499ee7ca529f1bd2dd9cbb35fb4bffeb64607f14920a4e2a339485ca0a65bdc229e290794a0573d2d5db9a2f90fbbfd9a9ec3755f7909d5aa15eb2852c95451d66a1e7e8d775b54d9321f9fc461656d8dde0145b7c60976ae5c4a46ae550363b77c4706a6b9dbe604e9fe84cca33fda5819d93f2a233d22547e685da0820917746f242ed4897a48fd6b9f864a52e2fe8febca0fbe8fda33b7d7941af72c9aabca00728f9cf6d016ffdcb1049d89c2e0bb4626a4460eb07bf64c8ee5f7e55e4761fdfc05effe52476fdf1f5f4d4acd2c7dc7bdc9b4847311c74baa206f69b7e7f2c148bb1acc9fa959012639f0aedd45fd69950281c23c92ac79aee9b1e72a273b839d2b966b775be6f5ee8fcf0ece8b9b1db430f123352cd3076b52205ca4a31505ef300dd69a0280299a48001af3104c8a40b269475bee0a21480f81444173cd9cbdf7fe974820c8caeafc2550668210378c18037373294035cbc2e58dfb4047f48c245e243eefe0987df33c4ca0f5462780b851e9f896a46b2d4dd04c3b8dd44ad2391952399ba5a7421be058f7a0d4f7abaafb8f385bdc5dd4ffe0a57bdf37b1c5bfbc9ddff5d7c87bc8a97e3875e2cfee80f1f14b73cf32b3cefbf8aff5bdc8b7338b6032bdf2d7ee8fafcec20b71b69288c8e38d58baca57ed26576f9e79bf3fdaca2561bba8e4261d743b3cb537a12c26e27407d32600d5b80d180209608f06c8ad77086d1ff5c8c26a33819c5d1b00653a6c194693065daffaf77f74d8f3552a9bf4f04b67adca9f5a6b5ecb282855b40ae2b5f4d027e52536359352387bc78d278cfd465f7ccfd5bf195e22df89ae77f58386bc48dc55bb9ddbabd68e7f2e78a83833f61f01dd72fb821a0d1b8c99cd29ddcdfb837e919a5f851e7def3339b3324126e0f1025ce26a8c3e44ff8ebf8266e58289b19cb7584c664cee2ce0a4dc914b8eeba3999cbb96b98abb93b983bb87bd1f798c7d0d3cc5be8ade087e8c3d087e1689ccba2266e2cc716b87bc2f765decab0e960532617cc67a684a7c4272626d67565668b73aceec0bcf8bcaad9897393e7d62ee62e0e2ccd5c93b9337e67e6f7e13f64224a1807fa4b6f6e8fe569e37767782ccf86fde1266e0cc71226d8c0080d997090437c0de38b7284de415caabada608898aa16a46879d9a3e5658f0e8541a3195f982e96afbc757c657bd147f7105d2e5f79eb50c239952e9cef4c124d36ad6f224d35c00b35c00b35c00b3599a48215d8384a188c53d8384aa4f1c4c639b16fa67aee7c79db40c4ccf358437964b59aaf98afb86643a1805652d5d4b3321d0c09997abec2cba49b2b1d0c8df2769545b7587ba69efdc7c695f91f3ef4e84bbf2c3ebfb5174f7c85eeb4cb063f7a72f9d36b3fb9fbdde29f70ec0f972e98bfe8a1427663fe9af90378c1fe77f145bb7f5efcd1fe678a1f7ca7a5f0039cdf8ee5ef16df29be5bfc53f1bfebc74628bf3c8c10f7536e370aa35a32c6a9b1151ddba3e2f312178bcb13ac04a07511465a6dc1d3d0c0004c29c0c1294103c4650bde25ecfed29f76d8d19cdd5f3ab2a3b63e67d1fb55f539d3bb35bc5bbbbff4bb1d5519f7ba1d75afdb51b8ee4cb1a3b9b47e66fccce42c65417c797ca5b4465f6bdc24df62dcaf3d65f41b87f48f0d5357d5a465f82dcbb00c55b263a4261a94799b22c8b9b0240543d14875085c18373e38e004e82a8642a8a616c448386c18ba585d66aa4a3082e7d35467f41f40deda73a75d31007e740e3c6a1e22ea85646a456a7d8a49d58649050401b828fc7f9528fcbfd5c375639ffc57f1224f58470e86bde822b5b43cc192cd0e76981df9164082bb40706ea846a7e287aa470079caa263e40d738c658f0160670fd85a7ae97d271ac95bb591bc5d1bc9eb4e3c6fd6faf3666d226fd60ea9dab915a1f75030e4ab634e21f599ba3a10648064a87998dcb6e7f5ab5ffdedd486eeb34a475fecbeecdc61355d7fc40fdf74dfb4fb1f2d0ee7764fffd5da1fbc5d954e4dbbb2d88347dc78c7684518bc92696d5f3bf952a8e75850fa98fd0bf75b349cbcf42caaf732d59972ca1a506821407c003a2102631446ad9c6451cb84e76dba00a2bea192a3534f0049098c18c60b990bd92b98552c9bae6f63f2f1d39929c259551313135293ea673173850555e736dcead3eb28f3d0354e95897499c89489fa325107cbef3ed925d265225326ea29134ea2548396499114539f1e65e4ea26a427b6cc4bceaeeb4e2f5396684bf58bfd8bc26b95abb5ab8d6bcd2b5357a46f666e536ed56e33be63de94ba217d8f769f715fa0da73b986d564ec58262a651a7106a1c6a8cd8e1c91418b1041dab0b5b15b6324960e6ac3aaebd338cd05392a23ddb463f530a9ba3ac8803190b5ec7cc10dc6d19b0260c75b0ebbbf3167583aa56b0a5713afaa8e8902cf3284c7e954adae293c571d1b167528abdf15c5d1c341340ca29260dd9a388967e0857805de8479dc8f7b1d7d18fd48fad1b14cf44c2859fa7adcc1030c4919d4881ba979a4eb8462c08e3a09fa9e8dd191356a854c07ac424dc6c6199b1ad9f4c976791bda43b950fb1cba5b2323bcf86461ea41082978e990b2c0f77222e660217b900e47e92c58213a2b90929a4b430d3d27b619aebc039bced75e4d200e41f57caa1e804180abf7f228017f28c886605351f59059b04b3bff57d75efee35933168c2d2e9bb9f892eb3eff8f47bfb899db6dfcf4a9de87f3a3f1bb73d65f7df3f1877e59fcfb83f81df3b2ef9c3bfe8a09132fa90b5d906d7f74d1e53fbf68f1eb1bf4dbefdc307f7a6bebd286b1cfacbe72ef15ab3ea13b6b3842ec6ec895bfef4478905f028c3c44cd847f173be3216a26fc8bd89945298e54b30c0da6f31c2bf5932b7640c004e35d7c1293168acac2f819ecc5190f390ac847d1138e9f97c3237f2a4b499ab7f7c2e92014e93b8a3b1fac8c94984769c8fc60e1232a075d13eba4b817e023023516f115abd8db8a314efbe94fbffc3bc2b43f153789d61ce0c38e8f6b867f0eb63e0b6365508b9a7bf05f0e19ec4361aecfdd6971c340c475c9dc40175cfed4853cc9805fa30114575ee1141d098c72d47bf38f68988f5e8310268c1eaad8e63012c104961127891c265ccb7b6f98efbd61b5b6a2cece4ec07bc69c540b879b500393965bd4e1ea42f556f15669933aa01e5195a43a43252c5144e2c1ad24ac2a48c4047576428a3de6a464494a8a9c5f1439847192707e42380913ee93a48c44699188171111c2950df919225e2f6e128948d3fc1a711af2e7137c17d94c08a18f58496e064786730bb94ddc007784e3b87e72cb0e65e1936e20a18716bbd1bf30add6419d1dd1c8e1b05b52ea65fe69e2df0d14f867ce9bb31d19727fe97fb64b36a637a29f86b25cf41d8d1934cceaea1d05310304e73a83e7f2350470c51eacc1ad6e54a01593d3067ff51b7ced2989da61f88e97075fe4761f7f67fd8a356bd846889246101256533b89aca388b9a21b267103cd7a992b8cfed2a0778119ba00de1895498dc050801f61e4132cc2828862602430ea6560b951e61efa7af804b5bff4661f0dec71d47a86105f23ca588d76269c47a3acbc3d2a3c054db6a6d893c373d0b9d61cfbdcb0f980f880e12db5d36ae268241bc8713975023741ed0a9cc39da3ce0f5cc45da42e0dace256a9d7040c2e400366b688448300a775d21f2adf0a1e7b54332cc7115e10454e565455a2dd3f55bfcfb603c150381ce82f75ece05038496f55dba2b7cebc80282511474812233f9c4f278ad581b03f1008dbaa2455076c7f20605baa61244dcb6f9a962da96238c01996a922c205548e099b862149a248082661dbb62c244643a1a8799a8467a22452f14c14c0339183383c73679266bd23917e7cfb36d7742a44235307a3e1c1c16864303c6de2a2091f0dd94be51815359528c2a4fc97cf6f9c5a19b13af9269bcd6ed4cd3d7b36ea66c79e325539e0ae5e635657af45b9d696295cc3e5d1f4acaedea6133cea45c1f499f3e6ec501dcea115b22386e3950537d37bf24f0d6ef5b90cebb343a3da7dadb80e53d40ac63f2c5ef3cb0f52d1d1320e7dfa9be975f1611ffda278d973c5d7ea8590bff80ab7fbabcefbeffd4b8a797f305afcebdf6fef63fef3cb496ce18ee4a2c9c71f8543513d09a812e2680a47994e851104bb27b18ebb4eb58b685261c4151211ecd8f1dd2ceb09c6afca82d1dd045473bbb5148c014618e815f55f68171769258d61d8b1527fe9e31d762827f6973e76743b9463237628c7d041a2fe43b8865efa9d33365c93631bc235393bc3368a4d728bce5e8a2fe52f55dee7598e76dc170589e7259e916495220292b2e2976585677889a17656903eca2409f613827955e131431056fa49c4916459620841a2de4fc28ea44a673bf27a99c8fdf819475314358998b3a793bb40de3de34818237fd9d4771450676ec139d565ae5223e19d9afe620d958159505e54731d3607dd9b8fa8e6eae8308f42a419dbb4662b2b5e6beee1000845a98d14fe64ea7bf674f5866675f5c629f049542595dd5d3a8a98d251c054820982c1b697a4da485eac8de4d9fed2fbdb22d46c3f81b5fca668acb14ec8458b8c1d7cedafb866c6c4f1e7e1f89f067791e5ccd4e2a475ebaed884b77eb563f0bbd48b3cb374888db3e350036a274f3acd92263545b46853a3d6d494d74605da63639aa63415b442d3126d71d3c2e1b76937377e2ff8fde8535aa0a19cf7a125376e69fde3911f37ec8c3cd7b027b2b7e13781f71ac409414cf1e2b4cc80efb6ed1340b836ea864da754229408679b9b727936df3c853da379b638377bb1b838bb5adda8bea27ea17d91b5da733a66cd96542e34b2c61f3ebff1f246d2186fd13bf5bbf4cd7a49e736eb5bf5cf7486ca6c970175e819a0977356542a3b35b4ee9996fff0dd3a4fa1c97a86ee081da2c2ba1e6742fde4c78e160613227caf3f1e17d0d0574713ebe591714669bcc0bca032e6eee20fa989432b9869900ef8255d93a266aae752fcd58d05a758ca42299a8ca7e50529d70e01c7fc0fd484e2bb53f0bd52658329d54fe63b7abd432b489399e199ad192e4f5d626afd66fa4b6f97095a6830be3b33825e74b4eabadcf0fc409e6cc9e33c6d2ce02ca56f1d023064281dae6d015bba05d4550ba8b196d40bfc5e9e24f84e9ef07eb0a0c0d0e15d30a50efe336c043e0c8e339447d091efe67570a20119c08f187d223b4cabdf5d6b3b9b350b3db0590a87cb6e3084a3b3d90f3fa4a6f8c16ce7e1c12cd4ff54bcb6c77554ca05ae14b794cd42f919ea4943f28f5addedf0db96a35541bc503f8e80191e0c04fcc1505d86a1a0541762dc3eaa8de9b8e8d9255b9f9f7cc5196d4bf75f825b27de72fddaaadef065fb6ebde5c7334c2954fb7c3cf4ad3d972f18b97cf1a58f64aa6ee89ef4f44dd3364cf3eb5a3495962f1b76eadc9e70cfed5dce05679eb2e6c8f19b4e1d8ddf6b889b0d535bce58387ffaa957d1dd7473e9104bf30d26aac2af38d7604e35525c1b3791e33a13bd099248d4c65be3e3e32b129b12fc185f47b0237a56f0ac68412c68738c42f0bce812719976a97159f0b2e840e25d757f687fe44fbebf86fe1af973d58144291149722d468b7f38d76938dc59c60cee626e7fd53fd82f4dd50ce82c4f502cce0b580ec475255cf6ae01805f461f3a6960eed43e059b8aa32c54d62bac8bb65260c7d0224b0807d1cc26106ef00d02449437155a77068134ca59b3e8da2babb045a0e504b08bd58a6cd81c2cec07e0794af3dda8d5b59418b765439a90018c37e12db8171fc16c0277e2e998c1d45ea7fb06d33d5545391c03eb61489e639bb21e06d6c3f45fa4bc0d4f0dd2af87c3009301a8248e544f6eaf0cbd005bad74312af0d8c16c16f22015dcea06ff3a019ee8cae09e95a8a7a6ce6ab546b58eac260113d5d5d633fe504599c7b027fa566efbd6d61ea7f8f9cf9e5f4a72dd77affec98fae5cfd136ef7e03fee9a7ed7ab57143f2bbefd10beef85eedbdf786ddfcbd0c76546e91073981d87a2f8efcfa250e988530b693e984109460346d39d53b1c28bc8e9d71bd850300521ac400c62edb82284e3ac82f58020d2091360c268e90781ae2ca45b808df5c69b2fbb9eef9ec248fa479d8dc9928a13f1d37da78766f9668516fa1686be4fbecf7c4f7bcc7c2caa8a5a445e4216334bb82bd515da7aed71f51969a7fc8caa06d59bd53f1346af3ddfb8dcb8de600c4c65676638202316a2156813da820ea02348f20ee1287fc7b881870c62833224f08a91d24590cbb531f028ddeb143be16c005e4a29d904c60863ece8d9f1ddd801f3c6012b661418210e708403ec700630411498604a3c00ec466babc6770740de05527b059c103a0522e8909591e9cb04d04e74eeca6533c288586ecf9093ea324805fc6565d7acba2e30063135060f67b32b8fd208f2ca32f4c9cab798858366e120041470c1adcda7522ce4562de6a081ca50d080f214d3b1adeab3ffdc5ffcdf959fdcfad33f24b646ae9f77cb8f1fbb71c99df8a6d0aebdb80acb3fc164c3d687634b97fde2b76fbff86d44d0a4d221e60317cf8c5f70d6c984d5d25a4e9ba0716dfeb6f8b9e41cf96cffacf825e4226e9174a17f617c20f126f796efbdc887be0ffd9f85fe12f910644b3091c846a940ea8a52e9249c4252da29c131a44deb2213b549fe29f173e5d9da25da87fcc7c12ff151ddc40146574c03c5e28a60213910674e123affdc0542a795aee7e7bb6015d396517ec2c94c500f4c9036cd7d16362dc75a68adb7d8844339d7954e964d458205ea98ca298ba77c6e81b4b220d94ad7d1d2e93a5a65788055860150c259081b6995edb607702bd5811bec94000ebbdb93e80561aff081501258ca1fd30546a886fd037a4fa876f715f00c181242147826529d9b51216968bc08224d43c2051e74d12ce660b6e3a02b683ae8df09514373de356d54b165da3cceb05a2d5c595e367ad19eebdfba72c99b372cbcaf65c760f22757aefed193d7ac79f8e61fde71fcd1cd98b96de66944ff7212b15f7ff5e72fef7f7d0fd5485da5436c353b0e055015fea1134aa07880743305ae20752b8b98a5dce5d222450cb8bdbb60aa0e3a6753aa2a0e05c8f6bbdc97fe635176843d2632227e9a3d357a5a7ca6bd207276fc027b79f482f81a7e4de01839163651101b5a283423b830b822c804e3c626738b494c938dc56501ed263fa6bba42cd9071c582a13637caf2fce2aa1723df7490d90c0ac09395a7fe90f1049a2ed6be05b6a65109146df4aaa6fcaf56a588b2628782b9dc9d1db5dd40c4ae04490ea860550afd6ea0a530f370c7c60a60427d5942bafb5bbeb5d0990ac58f738acbb2b2be2b0e2808fa3eb7eb286296421ba7f303bcdecc9668f41dcb09c8ba5a02eaf74aa63b0a7c32b34f2f0efd4b2a1a06cb7981932b37ea106d04eb8064a9e79e6bcddcd7f7bf693e267d8ff87b7b08ebf3a246fbfe9c23b06f79399eae8d9b7ae7b0acf0e3dda871398c12a6e28be5ffcc24c6edd7d29bef7e6d32f7d9cea1c1f42643df75b14c28d4eb55fc246a425323ce2445644beaffe407b4a13a35a83d61b1988b0113aad4e3491ab12354635e2320e90acdfc7323c9237fbb1bfe48339f439ac074a87c90cc1f485d22c62c83d18900c3b468cce01a2211b4fe436211c71e8ee8d389a4eba3d57ab01dcac5aba9f51b3e76c7dee6555fc5e56855af1407c044608f557a13a1d3d1a8e3c8f77a31a740ccba8ec910dad05f5cd3acc0ed87587b3870bae7346fbece46933a6d3d73a7ed3e225811779c29b921d43166fc47016679b366cc0d99e025ad96ad5b5b5d27aa751ad23430288e9006d8db17df3665ff486d5672d888d1e79f684bd7b99efddd1b33437e95cfb2179d2c26fddf1d5c588a0f1c599cca7ec385aab895f72162a0ae76f56d2feb394897e5eaa8a54352b197f735d5e19e53f5399e49f2dcc512e55be94ff11d04fa96bae1f5737aefeacfa4dcd5b9a855135a31a3b9b2729936a26369e53734ee362e1c29a0b1b1736af6fde5f7fa8e66f759fd55ba1201fe827dbfa1ae23e0154b19944c34111af4703681f12503fb9d631b978dc9027d6c6553918684db7563631a2415baf9b513d8433d3e1f0be1036434e6861687d886d761495743783340e81340e0d49e31048635aee0f8f7eea4a63fa2c5afeef49e3900b3203c20d3b50c2b91438679581d3a83601cc9400664a003325522f187b8d0f8c92c1268c4e63bac1781de840561bb0478d28e515a3160abbe3f493ddbe1df471bedb88649b57d550f19c9d76629bf678898013e65f5944c3f63d46bb611cf46a1d0fba9d0a7b50a1274401fbe04bd0b42fcdfa52b6682b83112b2b812fdeaa8c3c7dd5b5b78475bcbaf7f7472efbf5779ebffaf145bfdff25f9f3ef8f8b5eb9efce9d56b9e9c139d991e79d1bcf6dedb71c77b0f607cc703ebbf5af2cfbd6b9e669a7e3df0c2ebbf78f91774d76e4488a1887e3fbef759142c0dec088472d0dc081caf34dbc64c64766b149b74c0098422b99068a9969fe13032e29ce05764b5ac73d5f272436150130482d292d33a2a5792f0808483a070830e945d34c0e8a70b2b510fd682020cb0e6a5287d1e604761a1253f5d68c8e940870a5ab201f78fed04c0dfb42095008db951b9dee091205911dc12ec0d96826c90f861a9fdb0a47e587c7fda454099ada3724768bfc324a2c749b200d6f042335f3a219016ae6b21d22f338483fad2f5031001f140c0ed9816983ca302d4015dd9bc1c6ccf50a552f98a978d757d001ac10139a1f3ba90d679358635d1886144032f1b5096f672a3904eb7a7925567c1d2f3016b63df7503abffb3abefcaa533bed3c1ed1efcfc9ec2633f183c9f3cbcf19a59775e3bf81c22e816847007453d23013fe144887c22b8ec1522c2487d9b72b0c125b832c1828704d168b7c50e8c3c8c028cb8bf345836a55d822b132c8d7743093801478d8191875180113ed98b1eba045726e093c740fe6e149dfee9d226698bd42b0d481f4847e8e983096985b45edaec3d74402a497242c2080b2c61249e42c69c61f0a9d761c4733c2bf3429a43ec66760bdbcb0eb007587e803dc212c426d97dec0196a5059eb0fcecd0f2b3b0fcac4c3f9f0545c19615055b4e34c1f794292bb0d3c4af33c1ca0e68b1d4d17938eb5627ba0d010a2b2bb37d27ff4049b0d56addd2d7d7c7fe65efdee30136737c3f42a4f44871261e03ab69e3b1ce4a373de066935417a104a35e912a709d617a10d7f86ecd7ddc758c615461d46064b93437966de56ee6b890c87102cb1296f321ac2984f1abacc529024c69a63ca50a2fc42d63931ffb43a1a8aa6a6959dea4e084d2a94c57180a0576dae9147ad06070ace9c15ea45ba9066f5fa5b3a888e0e7832c55223eff4f6b267f5d8a525fba639a4923f23da8732a759d698ad905ceb881f8d6d68da6e8164de9a2696444538e61491762c8dd445f8334d019c66ec3328af1a6dd836eee2b5e5a3b2ad13eaaaff5b4fba7b09ffcfad75f5cf3a03ee51e76c1f12d7ba65e4465e42d0831ffa4b517e4e59deea40fa59a87b0ec2c352b46b81d0e609fb8bdc73c1acc397e363f4f620cedefdc319e91ca75992e32c6ebfce716a10101785140d6743357c9c4e6933e08681fd961d7d300f7913ebb3e6773f0400d3ce0dc68d7e77896e558be5d9acc72697e983c47be8ab952decffc99171ee7711d9f11d2629e1f2d756ad3b5b9ec5c7e8e3057ba965dcb3d28bdccff867d9b3fc87f22fc2fff8518b06599631896f0bc408fff94394914d302ef17049e61d93427fb394e96259e61697a90e568ca475190ccf663c391381642b1b522bd373109be30c4f084e8260d6b5e3d09709fe2f6f34a2397a95d26755998a431de8470279a8e08cdee3a234030035bd1de99a41bc1fea41121be1b81834d1b765200a3aafdb166f2c5950c05fce4196b3461df738c26ec8f660f0f657b3a3b281c8673fba06de44e09438344c1143bc40e06462f57a675493821ddc81029ac51fc6aa187e665002a233557e525b1aaaa83a7e59755799e42da9270b3adc6eb8c06e0e31e94a578d767115f1ad85e0338d7ed417af3fe76933e9ddec03d156eb62965f03275f2e947d9efb158f407f392e8f777c0404148dbc3f4c57fdd16739f8e0b73ddc8e60998818b77a5717c5c8705eb963efce34f8a4bf00bef171fbe9edbfdd5f3b8b7b87af02292b8ba487b12df80106e87ea99a98e56a9454ed21c5ec54c859e384937b86d802a35c149d2dfcd7e7320eba142a67db45b29936b736f878f706f6bdd4a1a271d08e50c2ec16de63ee0d8e9dc07dc118e49702bb8f55c896331a2fd995d454fdf09147ea0b52db719e1017404914aadef8a7dd0ec55155adf652bd73f103de7a00c2e2895ca70034ff8a369ecc9c29f4a7f1a82f6aa6be0ded77fe812dcd0078536ae15c667d871a88efce959e4f3448a59815f7509ab4c5495a72f5e266265225a26e03974dee365029ee341245d422dc317b432a19709a34cf8cad63b7c9f21602dc43bca84af6c049a65c22e135e98043ec245587addd1c086fb9d3355d17269f6207b50fa63e8c324f716772c494262b24e0ac79212c3d455c7f90035bb05ccd74523a6bc2f8d37a5b7a4493a148aeae94d16b65808de00c0d3826c08046ffcd088c56bd246ba2d02211c503d16e441ac3240b72290830b4e7558ac80e901b386d39b6238061f101bfa80187c408c06112dfa0131b0116310eb8b516105c66a4ca51fe54d3c2570c16940a4b50edebe0e845d1d08bbba34de87300d6c9204a2228f019157f50d91079a14053d8bf4abb2ef7ad4f18369eab22458ef28924af7e3353bbeae59dd3835b82215d16ba843ae0c660f422ebc6725a26e6d6727959e2605ae56145aeaaadf97f1ab560cdb5aa06cb896230effcecca1dd1f01cf1482764760d782eb5b69e13e3cf2f125abef4f5cf7ea0f7fbca36ec1b815ffd137e7a2b3368c6133f74e3bff5b73766fdd39584f1e5a76fe987b1f1bbc9f6c5fb366c6f7ee1e7cd7f3673e62c7a120dee6f83886f79127cd7ef3cfccc7be23cc311fcf523d59ab68b9b5267ec0dc173e102e85d9a4e8d7fd413bce09980f6a323d51b3ccb47a79c7418e2f013b2415061f260cfe8c029e8c029e8c32e4c9282046945a7886d71184ef56c09351208f0d660f7832341d42916e7cb702ce92824b0a56a685a9d86aa65e4df84898ac086f09f78607c26c9821ad8120f04d10782808dc13047977accfb2bc12b27fe9ccc85f7366ac0a67c6cda100eaeeebced1b41074e919fa71dd9ba3e0e09c7461a8ae0e4a3f3a0f9ff07082bc25c9a22cc80c6f662c5e8f6143b63d86a135b53d548902637809b60aaed8f8c895ef2d7c788629f7352d3de38a27d8ccfd5b27ae983af2dac12bc8cd972d3fed9ed707a12fc084d221b69e1d873414c12feca41dab00cc4dbbbe416fb443ce224a45e0822dc81175327f86389b9f2b5ec22f16c59c39c61e136c0b4f34bbecaee0c4f0026e8174b659b00bc1b3c3cbb9e5d245e6727b79f0a2f0553820f19c369f39873b479eaf2e6316718be465aa1c8ab3821557147f9963fce518b49fbaae3e704553318870c4807568d9861be11020d2ece552ca493120bc620eb7999b57f001c480a3a7d2b9e10246822924054638d16972c407311ca3cf584e8394311ca3d98fb273a0bb8e420aa93a0d8c413710dafc9cf62807ee8030a4273f405ad2d6f87c377252e91c154c846216ca0dd3dd3e36684494062abd56ef959c60f6640bc7b2850a23bcb2728446a40183308b9b257d8bfb96c4527305ec7468b888bcf68b95818f098fddfad2ef71f09abfdcfe41f1f0b3db37debc7dc74d1bb7131faebf7375f18f836ffce5dbb81a6bafbff6faaf5f7aed5544d0c6e262b6861d876c548def7356a9e630f354b3cb643b93bd49924836aa7555230323abc657ad486e4a8a634263626786ce8ccd15e7ab0b420b624bc4a5ea62737968696c20f95bff7be1f7a2bfad3ee83f587d20594a06ebd8ac990db4b163cc49ec99e63cf343e52f554553b1742618a789523e18d715a447ca0c11293344c42b471cdf1d49ed93b1293bf24279bdcc26812d92c022b405b08b11918139e4725d68659da29b3495296fb741c5e22aec6b25ad5e12c24d3fb8a9883442ff3a1b5a4e829a154950f3a424e8b1af27410160816d37099a98dc1ec62765418792a0d9a307bf99ff74ab1ff295e94f5f591f04037e68dd556f31152bbef1b131f75c7acbbe25577e70cdbcbb4eb11e5fbde6e927565db1adb898fbd96d3367de517ae0d1e2f1dbcf1a33789c79ec8d3dafbdf5daabef50697046713173801d874c14c76b9c650ac992a6f058d245d6aa7c67a033d215d954bda59acbf972b1ceea09be09b159be59b10b7d17c61656afaf7e937fcbfe88ff44fd346c36925a351bc89336750a99a4ce238bc9bbeaefc37f0e7e12f928f6153130abf9a37145d0797f9c55901ed25b01a2ea19c64399462fec896812cac0a6e1180b8df5065b0d61cf6a587103c29e800704a16040d8d380b02735c6dca0b511a4ab013d2721fe489f5e0009b7ca3b99a1f2ac86d437f24d95f9c714c81b886f0a10df1460ab0b90da142255d55f8f6c7a81cdc16fc6348f767c7369510fb6bc4424c4b7dbbe966d6a6ebabffb67c5cf2effed752ff53c3258f39335573cbe75f5958f16171371ec347c0a16b6146f78fcce2f4f677efac61bbff8e59b6fff925aca3721445e66c7210bbdef4c6df16193c5756c8e3d9d9dc55eccae6279c9122551d27c96a42146c40a6c44244b0d9b442cd6267dd8476a4f3ac8c29dae7f1f171cf210fee95815aa9407617992fde58606f90a2f749a3d79cfbf0a0d1e340b4757d26e1e74be289a10021ac87c65a30ed5af8595b4818bbb2bdcb480c007ac9b1e19b7b873fe79e3c68f1f7b9ebf9acd3cdc73c69827ea27772e5c39f826c2a8b37488d9c68e43c3996d8ecf4d9cb8466c04c6868a0ec62e41a13de5564f2e0198213046cb446d99a82913b425b2733dc4f86afdb563a433a509a9d9b58b6ad749774a37a61ef73dddfc22a349a1683834bcabf9ed101723dd849823b11c5e202e9016c80b9405ea026d89b8445a222f5196a84bb4be4c5fbd4181eea9c651a979f25ce5a2cc450dabea56a5d6a7be2bff40bda7e1fee67b873f263fa53e5aff58c38ecc4b9920fc2f7486e1eb790d8c5d225526bcffd77b0e25bc7fca7b0e25aa68eda85d9d9f27d6a755998d2633015639a52a4a531cb591664810473a23d323e747b646f646782392885c1ef920c22622774548e467a49b9e5fe7e61e1d3f7dba494bb04dbc0f13844d0c5d1276f88339c8499aba95c3f8940555cbaa48553c20d0567100d562dd927908287ee4f8281bb1f153944414475311c717ce8da42f6f83dc167821d48621dd1138b32692a4af8c24e9ab68690bdf1d81ec21bd3abe3bb29bcc4742e9f39d10994a35f597069e89e7f735e126fa99f4f54de5122620e8eb9b5c6c31104777d277698ac237a8a96fca2d1c393092748e5c3f928ca4e9d51482afe29d6102edb2e97d20e8f7026e49d0ef96042e4ca60cd02e067c7723e909b72f9d0c883c28e1f7f22b0022356a3f2807802223bc6c68a1a75c4f07d644d6cc660faf9c56068165b33d34275ae1c81ca688093850a4072060d41fa79519f466a8750cc5809dbed671ea8755d771fee68c65daa6cf64f85a2d1943528310c3dc302186abfdc918aad1eb62a8b64e53c54639861bea2599cfb2319430aba845eb368c81015ca0a6ec860d1bdc3e00ae0ca031600ae1f57e4e3a50a13e537f0a69cbd15e4d5f2bf80805a1061432419ddb8d5baf59b7a62dfddd971f9c7edae8a6bb675dfbb37956af7ac5e2754b82c196d88d2fdc3f7bf1cbd7ee7d179f1a5fba72d18453ebc2e99153364c9bbcb621913de39a4bc2672f38bbbd2e5ee59353ada7ad5b306ff3b93fa1b23555fa9c34710fa2104ed0d3155cf7dfebc35151ea209409be4cc8d0e62443a39003ceacba4c6e7d0423ac6a326650d094b286cc07e38c6298b5a8166b27992750986ea7555c12c489d2c485c20a61bdb04960919014b608bdc280b04fe0a1e4d9ab7da6360f109f033ed1ebf1e0115e3534757f5c73999a5034f4ea59cdae3320ec264b50188fda76f1d7a236706e979bbb394835da615a2742359ad5da6abe525120970eb9380a9abeb5dae1340368cd4bcce8591ddf5ad67ce38d3b9e79c6976da87e78b3396ed123e4c23bb0b0acf89d3b06bf3bb5394aa36aa543cc013683c2f886675194820c02a11c49fa82b4c4f18813b1fdb9ac0fa7445f50c5bea0c223d98a330a6a0d96fdd260d9c8080ef9a5c17438441dc82878a721f04b4336a44e8730a221505e905a7593a8e091c26950e09186205c01fdd2343a65a5101e08e1d0b4285dd87aea8c468f44c98ae896686fb4146529848b2613dc44849b70484b438a949e299594f6490724169a6a42ce6f48917ad93e19727c00b486bc1e78a312a4d6a4699193026b5efeec9b6ea7ab54015cd7e12a53d8cc51d6d43543a3e508b4991ac39bac1a439a68b9d981a6a60da840779f878aa9cf40522074a2090cd3b9eeadf31e9d6e2a7d8a75d9cc99778eedfb41df19cba7b75d41ee19dcf19d119367cebaeb16923fbe1f617a36097388cd20998ca23d55003254aee340df2cf5217066d9908548e3fa349838be9b981558bc10272259e4313f54d09382fe0f2dd9caba1e28ebd9d5c661546be565aad2342b2f05ed784ea403e92f7dbac38e531d04b7328dba49d53539d4505d43ef1d72a4da740e056bd3f4de7ee7ba86537228d9704ace501b51839491f3a84d3e034d9667e3d964ae3847ba185f4c168b8ba535e82a7c15592bae91ae9237e28de466e656e116f136e921f48074b7fc13f488fc33b44bd826bf825e92f7a3b7e4bfa23fcbc7d151b959469c1c4641b90165e476793a72648973ec608e73142d573e5e8a5633f1d476a3dc6ac02128d4f5e4bbe95cd0c7c003a1b3028f128e53158af17d2ffb8649ffdec8be91452d43654fedb2208a6949f64b928c1842d26eb50927cb48764b477841961884b91615abb5a2e338d27a7a201a8e3de370eb39c2f5e398232589836b954f7f43d9f270343258182c44c3870f16bcbebe43b9040b1209276a4228e4dec3179ff8a9ac3e2ad76ff85a31fecfe2b2ff3a984e84b37f7db678199b19bcf192cbcf594d6ea1b940b71e63179b4136773ead13f138cdf5eb21f55e454bec08d4a69b10bfe4dce42ba068998ac0fba76ed186099a96b60485c4968b9e70c1eea082e1825dbe200e5da052d54dfbbbb51b2eb39b50c6c443a58754ce1140f4ace2d83e3805c9cb9f7917dcc6e0e0d47a39e0a3ee56b16abd0b6e392e3bd4fedf4aba973d0df47e39f1fcfe8e135b889ee971d48dc9092e761e4699164bd193a1e0dd144a59493a524dd6a7bb99e001a785529603f7658bc148e5051ef3868c648d16b9906ed5c28495594bf6a2cdae2eb268dbfc37ccb7df30df8456475e9114b04059e5c79ca0e1c74d6ca34cceb4e65b775a0cfd7fc09b77cfe460cb043d8dc491123539335ee5a6fe9c5d89548ee555c9c7c7a488cdb188e51549d145db443ec62fc4c59852a5a7505a6812b37a0eb50963c4b1fa046632ef0853c52ee57463b275a63ddf38db5e2a5c245e62afe5af165689cff2bb8d9df63ff8e352836235a006ad5e6f30eaed16ff68d46e5f25de2c3ec0dcaf3e819f244f2a8fabcfa09dfc6efd57ecdbfcbbd221f690f1b17d94ff528a2b50f4aec268c2a8c368c0687b7b3b26eb066b234b14c4b460a4751a9ed00546c36a5aeb2fbdedb4539da0913486867458c37e1f2f2b5646ce5ae7b067cb0bac65d63aeb364bb6649641982e87bb305faf476bc91e6d71eb6fcd83f4d7b5f62c3b1f73fc0cd4a9099c24cba2a2aab26951f868d70e0ed9c9fed214e762d9d093bfb004312958b69de5043fc709baacaa694df76b9a2e5a86919545bf2c8bb478cd13278860c16645c352750dbe9eada92aed9249e58b6dd03e25b2ff98a961daf26ebdc668fdf809474e4e97f1e5f2f5b47288743bd2740b5f6e5d6f118bde534c0e2f84dc16c3f5e3279ec1c77cc72e063b3832f568a1101e2cf40c167aa8242a84ff75e19a279a2c18ff0f756b826e76d03f4ad3bfaedec4ac397d5a524d92e74b07102e1d407a695f1f1a6e24edfed281a1330ee676f5e6664147b17ddb04dabc7d6e576fcdacaede5600318ba503db84a4fba8edf576a24d04f6ed3492f4bdc5fed2beedc270fa8edbd168427bd9e38a371f7a5d085e67950eec90936c929e5b0745715e4b823777da79d46c430b916dbe13d54c6e0e8e6e3fe8fb74b2f5fdef7ea8480689ec0b413d1d53cfe0aee273bb9fea645b9f7a7673dba93bb716fb9e7baaf11d3633f8fd83d6abe4b2c1075e7b835c7c7c3f59f7cc577b11460642ccffb01964124c9b5379b2da858842d19b9b5085fb9ece0f1858e15922f184d764241be0f0192d3474d6d9098d7663bb0c1b1bb511c8123b3322f979c67dec7de283faf78c016e801f105e3324c309e6a38c4f0a6851b30d8f5136e03b15b1c53e979d2bcc55e6e8f7e307e407945da45ffd95f2aafebab99f794bfab5f67bf343d92eef514545b66584359377cf73d02965f088684896090fbd9d2867655d784bccb998e719419424ccf312adab530cc3d4350d1b86662a1849445318d594798318b2f9327a5922661a497e842486682f6b584bab8c5f551959921886f0a6a6a92a92a7dbd89ea25da7d6cac605bc749d23f7e3d82e879fc1af87bee3a73b7a92b98ed44e47184db1d641b4a570d455ccd1f061f343f3e861e88f77625bc099b41ed317bcd3a7f286b151046677c73d22ec820eb1c3e3ad3e3d5c9557a0d554555ead0de599da10dcdf5e9337a1d157208f6b6bf292132f77bec8ce85ac06e4e0e9dd568c5b4354c3b7d3cc3b538f0d7c63f1c13f3e7a4abc39bde39de2ddf8f6f7f68f297e421a70f18bc9c3c7b71e2faa83ff8dcf9c5b2c50ad5f539cc9fc8dcda02859ea240c388ec30fb13c7a9e0bcd02016211143d55ae4e8b1bf287c42b8cf4403aaa7e41b957a0825cb3dd1e6246b59219ab64bfc1284c3c62d8bcc2fb1cdb482a8e9af49832d2928dbe170dbf118d98f406e259a0e6623b8c382dc478df591ecf37f8671b5b65c6d11c8318c986e139930e822ad9412d6cd72bf56abd364a1da5b5e90f5a4a83dde03b2338d79eeb9b1b586c2ff62d0eace5576b6badabfd57076ed26eb3eeb0eff0ddea7f407e5279de7ccedaedff54fed8ff0f6dd0fcc25f8a57975937e853e231d69860dc68304664e8ebbbf136b72f0565d876c3504dcbb665c444fc3e5fda96fdb62d1baa61a96945f62b8aeca325850a4fdf00c5cd386989bf1027f17ed2f98ce1736cc7df4fce71944edbb1c9f9f60b36b1fbf1f89d06ae45136332bd04b3e524d5e1ea749599a19654a2f6e3f13b5a68910ae9ec8b25d75d1cce4623e620ed741f0d4387bcb079f460849ef37a381a360f0385c2d4112db3ae58894da1bc4bab8c3bc43d5dbdfaacaedef0cc79739e436ae910524a8770a56cf497dedfd99e976bdbf33a6d5117c85b5e9396b9d495423d85329f5698a7595fbd8b476d87ba62cf3ca5677fd6d55eef1fdbdc7146c8ca704a71f98bef656b13d93ff715979d961abe6e76ae78c95366432ab6d4a8621b061fbc72c3bad564e9f15f6d1d3f7716e5e506849837d90cd2f1cf77e2a1ae792e48c4ee27af88c4c623ddcadeff76243b94c3e3aa01fbf4a27366754dae9134482d661ee7e529781299244e91a69b0bf039e41c719e34c35c862f24178a4ba46bf02af11ae9767c9378abf4053e4acfaec8e046312be5c51f89ef6081eeda5d6620479aedbc444be6ebec3c2663249988b29cc6c48f31c1f45c0472019715785ebe4043eec1b3609c647599f463a34f14058e7f8ecc47080934060c99bb5a6d8b8e91eee80bf5f5fa119d03f337452fe9ab907c1dc65b119e8e2e4725c420e81e852286b9aa868a2f1a6c77914ae620250e6601640e2766643bcc0f3b3b063f849a0ecfbd30757aa620d5625e4ce9f405739e69c41991c61eddd913e95ce2fed28bbbe82cd2a9745b1bf7cc851260aa9adfdf6ed049f06e0eed8ae52531183b95da9adb43f4a17f3a72304ffcc13c89064f08380a256ac37c1ded9d818551ad358106f2d815738ad3998b067f7ef9da25f82ff730227fcf5583e75d237d1fce17c7af8a88cc470c8a3a1a6e4384a33d3ebc63c30b66076a393c62b8d5561310117ef5eebb1141b398bf9379dc6f918242e877ce82cd91ad11f299f0998f7c207ce0237b85bd3ef282f0828f6c15b6fac86661b38fdc25dce523d709d7f9c871f1b89f2c1397f9c93c719e9fa8a2ea277e9f28845443418cf185ce7c41748d60b543431df418bb194e8bef72e17ae12e8111b06fb4bf43d7d40ec3d09d5034a75f8985d16207c1a88361ee229844c23d4fb8f148c0299a8307e1bc5da05067a163909ec102569877ee8b65d3103f8d23a1953d3d3db8c7fbc1051ca883434f423c2fd454d0d8fff364d3fce6f61c83ffa34cb17b7efda39b3b66344e0acd3ff70485089acc7c42a671afc04cfdde99063375443ce22758c47e724038e023fb847d3e32200cf848afd0eb238f088ff8c83dc23d3ef26de1db3eb24258e1238bc4457e324b9ce5cd94a12a0cf23feda373a36ac617baae7668587c5aa00f0cc7cc1784a00e8c75a343f58df6d76ba171aaaad1e9d2ae2484e940c268b11ed1860b4b60b6cc63850e9a15a4bdef3bcc8326d07016cc6173f070f9f6e4c91a9aa79e1eb4128ebb6fa5e73ed28361dae9d9f565fadc9f27b2f39b47b531bf2b13ec3f7ffda39bc7ce6c9c1c3c7fd6098af2e174f490d0cb2c43264238180c05787af85d7b4d5b4d2653cffb6e7a71f685bb374c3def922f5ee2c79ed531965976f7fde961c3efddf4cab245179cb71a61f460711673293796be3ed4168442aa51edf02e99cc83579db770d1b25736dddb724afa7ef3acb11d67712f7e39ee92f3a66ed87de1ec171142ff0fe8dce6c00a656e6473747265616d0a656e646f626a0a3130342030206f626a0a3c3c2f54797065202f466f6e7444657363726970746f720a2f466f6e744e616d65202f4141414141412b417269616c4d540a2f466c61677320340a2f417363656e74203930352e32373334340a2f44657363656e74202d3231312e39313430360a2f5374656d562034352e3839383433380a2f436170486569676874203731352e38323033310a2f4974616c6963416e676c6520300a2f466f6e7442426f78205b2d3636342e3535303738202d3332342e3730373033203230303020313030352e38353933385d0a2f466f6e7446696c653220313033203020523e3e0a656e646f626a0a3130352030206f626a0a3c3c2f54797065202f466f6e740a2f466f6e7444657363726970746f7220313034203020520a2f42617365466f6e74202f4141414141412b417269616c4d540a2f53756274797065202f434944466f6e7454797065320a2f434944546f4749444d6170202f4964656e746974790a2f43494453797374656d496e666f203c3c2f5265676973747279202841646f6265290a2f4f72646572696e6720284964656e74697479290a2f537570706c656d656e7420303e3e0a2f57205b30205b37353020302030203237372e38333230335d203130205b3139302e3931373937203333332e3030373831203333332e303037383120302030203237372e3833323033203333332e3030373831203237372e3833323033203237372e38333230335d203139203238203535362e3135323334203239205b3237372e383332303320302030203538332e39383433382030203535362e31353233342030203636362e3939323139203636362e3939323139203732322e3136373937203732322e3136373937203636362e3939323139203631302e3833393834203737372e3833323033203732322e3136373937203237372e38333230335d203437205b3535362e3135323334203833332e3030373831203732322e3136373937203737372e3833323033203636362e3939323139203737372e3833323033203732322e3136373937203636362e3939323139203631302e38333938342030203636362e3939323139203934332e38343736362030203636362e39393231395d203638203639203535362e3135323334203731203732203535362e3135323334203733205b3237372e3833323033203535362e3135323334203535362e3135323334203232322e3136373937203232322e31363739375d203739205b3232322e3136373937203833332e30303738315d203831203834203535362e3135323334203835205b3333332e30303738315d203837205b3237372e3833323033203535362e31353233345d203930205b3732322e31363739375d20313738205b31303030203333332e3030373831203333332e30303738315d20333134205b313030305d5d0a2f4457203530303e3e0a656e646f626a0a3130362030206f626a0a3c3c2f46696c746572202f466c6174654465636f64650a2f4c656e677468203332383e3e2073747265616d0a789c5d92cf8ac32010c6ef3e85c7f650a2266db710024d422087fdc366fb00a94eb2c2c688b187bcfda2d36d610f0adf37f31b47c7a46aebd6684f930f37cb0e3c1db4510e96f9e624d02b8cda102ea8d2d2df55dce5d45b92546dddad8b87a935c34cf29cd2e41346bd78b7d2cd59cd57d892e4dd2970da8c7473a9ba2d49ba9bb53f3081f19491a2a00a069254afbd7deb27a049c476ad02e3b55f7797aa7b667cad16a8889a63377256b0d85e82ebcd0824678cb182e64dd3340501a3fec5f7485d07f9ddbb989d1634674cb022281158c6d21a9540d544955651ed4f5195212618cfe229f77a2f7fd59fcd9c23c49015c7c8b2262a5ea359e161192a34338e2666a6473431333da189a5f787686688ef113f205ee2e5ca10138c479c23c7d33298fc24ee17c096c38b85c93ec6216fce81f171fc7104e1f1b581c70fb1b30d5458bf9a5ca4d00a656e6473747265616d0a656e646f626a0a342030206f626a0a3c3c2f54797065202f466f6e740a2f53756274797065202f54797065300a2f42617365466f6e74202f4141414141412b417269616c4d540a2f456e636f64696e67202f4964656e746974792d480a2f44657363656e64616e74466f6e7473205b313035203020525d0a2f546f556e69636f646520313036203020523e3e0a656e646f626a0a787265660a30203130370a303030303030303030302036353533352066200a30303030303030303135203030303030206e200a30303030303231353935203030303030206e200a30303030303030313337203030303030206e200a30303030303635343936203030303030206e200a30303030303030313734203030303030206e200a30303030303030323630203030303030206e200a30303030303231383233203030303030206e200a30303030303035343837203030303030206e200a30303030303232303531203030303030206e200a30303030303131303530203030303030206e200a30303030303232323830203030303030206e200a30303030303136353239203030303030206e200a30303030303232353130203030303030206e200a30303030303232353835203030303030206e200a30303030303239363438203030303030206e200a30303030303238313437203030303030206e200a30303030303233333435203030303030206e200a30303030303233343230203030303030206e200a30303030303233343934203030303030206e200a30303030303233353638203030303030206e200a30303030303233363338203030303030206e200a30303030303233373133203030303030206e200a30303030303233373837203030303030206e200a30303030303233383631203030303030206e200a30303030303233393335203030303030206e200a30303030303234303039203030303030206e200a30303030303234303739203030303030206e200a30303030303234313534203030303030206e200a30303030303234323238203030303030206e200a30303030303234333033203030303030206e200a30303030303234333738203030303030206e200a30303030303234343438203030303030206e200a30303030303234353234203030303030206e200a30303030303234353939203030303030206e200a30303030303234363733203030303030206e200a30303030303234373433203030303030206e200a30303030303234383138203030303030206e200a30303030303234383932203030303030206e200a30303030303234393636203030303030206e200a30303030303235303430203030303030206e200a30303030303235313130203030303030206e200a30303030303235313835203030303030206e200a30303030303235323539203030303030206e200a30303030303235333333203030303030206e200a30303030303235343033203030303030206e200a30303030303235343738203030303030206e200a30303030303235353532203030303030206e200a30303030303235363237203030303030206e200a30303030303235363937203030303030206e200a30303030303235373733203030303030206e200a30303030303235383438203030303030206e200a30303030303235393232203030303030206e200a30303030303235393936203030303030206e200a30303030303236303730203030303030206e200a30303030303236313430203030303030206e200a30303030303236323135203030303030206e200a30303030303236323839203030303030206e200a30303030303236333633203030303030206e200a30303030303236343333203030303030206e200a30303030303236353038203030303030206e200a30303030303236353832203030303030206e200a30303030303236363536203030303030206e200a30303030303236373330203030303030206e200a30303030303236383030203030303030206e200a30303030303236383736203030303030206e200a30303030303236393531203030303030206e200a30303030303237303236203030303030206e200a30303030303237313031203030303030206e200a30303030303237313731203030303030206e200a30303030303237323437203030303030206e200a30303030303237333232203030303030206e200a30303030303237333937203030303030206e200a30303030303237343732203030303030206e200a30303030303237353437203030303030206e200a30303030303237363138203030303030206e200a30303030303237363934203030303030206e200a30303030303237373639203030303030206e200a30303030303237383434203030303030206e200a30303030303237393230203030303030206e200a30303030303237393935203030303030206e200a30303030303238303731203030303030206e200a30303030303238363638203030303030206e200a30303030303238393033203030303030206e200a30303030303239313331203030303030206e200a30303030303239333733203030303030206e200a30303030303239353636203030303030206e200a30303030303333313636203030303030206e200a30303030303239373430203030303030206e200a30303030303239383837203030303030206e200a30303030303330333035203030303030206e200a30303030303330343733203030303030206e200a30303030303330363139203030303030206e200a30303030303331303537203030303030206e200a30303030303331323233203030303030206e200a30303030303331373239203030303030206e200a30303030303331393031203030303030206e200a30303030303332303731203030303030206e200a30303030303332323433203030303030206e200a30303030303332363939203030303030206e200a30303030303333303038203030303030206e200a30303030303332383833203030303030206e200a30303030303333323430203030303030206e200a30303030303333343638203030303030206e200a30303030303634303430203030303030206e200a30303030303634323738203030303030206e200a30303030303635303936203030303030206e200a747261696c65720a3c3c2f53697a65203130370a2f526f6f7420313032203020520a2f496e666f2031203020523e3e0a7374617274787265660a36353633370a2525454f460a	2026-08-18 20:35:16.297394+00
\.


--
-- Data for Name: message_mentions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_mentions (id, message_id, mentioned_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, conversation_id, sender_id, body, is_quick_response, delivered_at, created_at) FROM stdin;
79d03230-668e-4be9-96e2-f7ff6b001555	340b2395-281b-4398-8c76-7dd802add2ab	87a4b8b0-763c-4633-9f59-623d53ecd5a8	👍 Got it	f	2026-08-18 20:40:50.035366+00	2026-08-18 20:34:52.296884+00
7460bfde-78ba-41aa-ba1e-b21d046799ae	340b2395-281b-4398-8c76-7dd802add2ab	87a4b8b0-763c-4633-9f59-623d53ecd5a8	🙏 Thanks!	f	2026-08-18 20:40:50.035366+00	2026-08-18 20:34:55.385585+00
67a9225c-2e6e-4a63-a649-65c1270ba391	340b2395-281b-4398-8c76-7dd802add2ab	87a4b8b0-763c-4633-9f59-623d53ecd5a8	hi	t	2026-08-18 20:40:50.035366+00	2026-08-18 20:35:01.379658+00
8882257a-e2b5-4c36-9efa-8d11304d0ecb	340b2395-281b-4398-8c76-7dd802add2ab	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	✅ On it	f	2026-08-18 20:40:51.468177+00	2026-08-18 20:40:51.460983+00
b64c6bbd-8448-4ad6-8563-9a23506a37ac	340b2395-281b-4398-8c76-7dd802add2ab	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	✅ On it	f	2026-08-18 20:40:55.197512+00	2026-08-18 20:40:55.192162+00
8b6ae3f1-f99a-451c-a9f1-5dbf0c56fba2	340b2395-281b-4398-8c76-7dd802add2ab	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	👍 Got it	f	2026-08-18 20:40:57.700702+00	2026-08-18 20:40:57.693963+00
054cf4ed-b7a3-4529-8074-01e5f9f66c81	340b2395-281b-4398-8c76-7dd802add2ab	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	🙏 Thanks!	f	2026-08-18 20:40:59.913978+00	2026-08-18 20:40:59.909948+00
51017dcd-9379-4968-a3d3-49e6272a72e1	340b2395-281b-4398-8c76-7dd802add2ab	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	⏳ One sec	f	2026-08-18 20:41:01.711437+00	2026-08-18 20:41:01.705577+00
94fd9c9a-cc89-4a6b-be33-14c33bdd71a3	340b2395-281b-4398-8c76-7dd802add2ab	87a4b8b0-763c-4633-9f59-623d53ecd5a8	👍 Got it	f	\N	2026-08-19 08:10:44.786924+00
e7a618a4-3348-4299-b9f2-6c4cd5d5656f	340b2395-281b-4398-8c76-7dd802add2ab	87a4b8b0-763c-4633-9f59-623d53ecd5a8	🙏 Thanks!	f	\N	2026-08-19 17:11:05.715254+00
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notes (id, user_id, title, body, created_at, updated_at) FROM stdin;
2a45fa73-5746-460a-8513-78c57763f3f3	87a4b8b0-763c-4633-9f59-623d53ecd5a8	demo	dfggfgf	2026-08-19 19:51:13.952519+00	2026-08-19 19:51:13.952519+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, lead_id, recipient_user_id, type, message, is_read, created_at, recipient_role_id) FROM stdin;
35ebd3fd-9e51-4581-990c-59cb01e72ae6	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	\N	record_opened	Dev Super Admin opened lead 6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	f	2026-08-18 05:58:32.895966+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
ee0951f0-ad32-4565-97ff-2971a34f6cdd	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	\N	record_opened	Dev Super Admin opened lead 6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	f	2026-08-18 05:58:37.265378+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
1d64c6a8-3d1c-48b0-8e88-2fc8c0298011	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	\N	record_opened	Dev Super Admin opened lead 6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	f	2026-08-18 05:59:17.218129+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
9c1fc98a-9f71-4b91-ac0d-e4208f97c496	6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	\N	record_opened	Dev Super Admin opened lead 6c20259e-cdc3-4cf7-9f84-b55afce4f2eb	f	2026-08-18 05:59:17.43394+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
cabb20e7-6d07-48ac-bfe5-4dc1d384e6de	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:51:43.930417+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
7fa4a214-d938-4e65-9df3-bd48ff0a1ae2	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:51:57.154185+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
4e4c338d-d9aa-4840-a9f4-0598f2865432	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:54:12.574187+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
84d246b7-2dc4-4d51-8950-5a09c2a025d1	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:54:12.583041+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
e54747ea-7cd9-4b4b-9752-0aab8f249a66	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:54:13.679209+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
0c9260fa-20cb-4541-957e-3531e45f2be0	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	status_change	Lead 6c07443d-6bdb-47b1-87ed-e65618455fec moved from authorization_pending to client_approved (customer authorized)	f	2026-08-18 16:54:50.760304+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
dc041361-3735-4189-882b-db18271ecdc1	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:56:41.651375+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
1f0f3bed-30ec-46fe-8b73-ab3445e595e8	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:57:09.522805+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
b53c9656-bc9d-435b-ae1f-f8cf77eb6281	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:57:19.195063+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
b4417f77-64e2-4e29-8a77-faaf980f92a2	6c07443d-6bdb-47b1-87ed-e65618455fec	\N	record_opened	Dev Super Admin opened lead 6c07443d-6bdb-47b1-87ed-e65618455fec	f	2026-08-18 16:57:25.916767+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
837bfa31-c5f2-4efa-83e3-d37beb3395f7	7590aa2e-16ba-4096-a11f-016ceee5f059	\N	record_opened	Dev Super Admin opened lead 7590aa2e-16ba-4096-a11f-016ceee5f059	f	2026-08-18 17:02:43.610565+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
7467e4b2-31fe-44cc-96de-126978682173	7590aa2e-16ba-4096-a11f-016ceee5f059	\N	record_opened	Dev Super Admin opened lead 7590aa2e-16ba-4096-a11f-016ceee5f059	f	2026-08-18 17:02:46.879816+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
ca648b2b-c2a6-4103-8480-4591c8cb3ed8	7590aa2e-16ba-4096-a11f-016ceee5f059	\N	record_opened	Dev Super Admin opened lead 7590aa2e-16ba-4096-a11f-016ceee5f059	f	2026-08-18 17:03:16.721417+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
68ab4876-6bfd-4ab9-b5cf-e71c99cec5d8	3fd31619-366c-40f6-a104-1d7e46a528bb	\N	record_opened	Dev Super Admin opened lead 3fd31619-366c-40f6-a104-1d7e46a528bb	f	2026-08-18 17:03:47.990131+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
c3dcc298-72d1-4901-a99e-a7a62c276c28	3fd31619-366c-40f6-a104-1d7e46a528bb	\N	record_opened	Dev Super Admin opened lead 3fd31619-366c-40f6-a104-1d7e46a528bb	f	2026-08-18 17:03:51.326109+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
7023cedc-ead6-48fe-ad91-853df02a088b	3fd31619-366c-40f6-a104-1d7e46a528bb	\N	record_opened	Dev Super Admin opened lead 3fd31619-366c-40f6-a104-1d7e46a528bb	f	2026-08-18 18:44:24.760259+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
fd2bd3e7-f852-4bb6-b990-719c5c19b3ca	\N	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	message	Dev Super Admin: 👍 Got it	f	2026-08-18 20:34:52.307814+00	\N
288f8348-aced-4a57-ae99-70f0c92f98aa	\N	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	message	Dev Super Admin: 🙏 Thanks!	f	2026-08-18 20:34:55.394347+00	\N
ec523953-6a40-4192-a80a-5301c527ab75	\N	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	message	Dev Super Admin: hi	f	2026-08-18 20:35:01.389247+00	\N
5b893f0f-2c45-4c71-b4dc-dde101994c64	0b70bbcc-85c7-4934-bd79-4c14b575b15b	\N	record_opened	Dev Super Admin opened lead 0b70bbcc-85c7-4934-bd79-4c14b575b15b	f	2026-08-18 20:36:05.528994+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
62d978cd-acaa-4d27-a934-5da257aebf2c	0b70bbcc-85c7-4934-bd79-4c14b575b15b	\N	record_opened	Dev Super Admin opened lead 0b70bbcc-85c7-4934-bd79-4c14b575b15b	f	2026-08-18 20:36:09.674675+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
7130c09f-d185-4104-b2d6-c6076131caed	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	\N	record_opened	Test Agent opened lead d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	f	2026-08-18 20:37:08.412958+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
bdc964ea-5a40-46c1-8e28-c5c3034a2d44	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	\N	record_opened	Test Agent opened lead d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	f	2026-08-18 20:37:12.782873+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
3fa2dfb2-6b6f-4efd-89a3-46a41dfe4763	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	\N	record_opened	Test Agent opened lead d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	f	2026-08-18 20:37:59.331634+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
b921424c-2c28-433e-addb-ff01aab77744	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	\N	record_opened	Test Agent opened lead d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	f	2026-08-18 20:37:59.370514+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
e867d681-dc78-4bd0-8000-2515014b99fb	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	\N	record_opened	Test Agent opened lead d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	f	2026-08-18 20:38:06.323974+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
c1c6c99a-5e6f-4980-9f08-a3b43be9fe35	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	\N	record_opened	Test Agent opened lead d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	f	2026-08-18 20:38:16.102601+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
ebbdcb5e-9093-48bc-8d4e-e4d4fe3b8138	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	\N	record_opened	Dev Super Admin opened lead d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	f	2026-08-18 20:39:18.4533+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
53278e4b-4208-48e2-a24b-b2f0880657a5	d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	2d9c46e3-168b-4bf0-93eb-bb8664075de4	record_opened	Dev Super Admin opened your lead d04d7eea-4ff0-4c89-8e21-3bdbc00a1c96	f	2026-08-18 20:39:18.4533+00	\N
c36622e2-458e-447d-9d37-b8bbe4ab4839	\N	87a4b8b0-763c-4633-9f59-623d53ecd5a8	message	Billing Bot: ✅ On it	f	2026-08-18 20:40:51.474987+00	\N
f0eaead0-4860-4150-960e-26834682a9c4	\N	87a4b8b0-763c-4633-9f59-623d53ecd5a8	message	Billing Bot: ✅ On it	f	2026-08-18 20:40:55.202479+00	\N
9f978ceb-9dc7-45e7-952a-eb9a03141c89	\N	87a4b8b0-763c-4633-9f59-623d53ecd5a8	message	Billing Bot: 👍 Got it	f	2026-08-18 20:40:57.707176+00	\N
353618b9-859e-4fa3-b251-a5a9d0ba6804	\N	87a4b8b0-763c-4633-9f59-623d53ecd5a8	message	Billing Bot: 🙏 Thanks!	f	2026-08-18 20:40:59.918289+00	\N
c483b848-8578-4e6c-8622-aee856492d0d	\N	87a4b8b0-763c-4633-9f59-623d53ecd5a8	message	Billing Bot: ⏳ One sec	f	2026-08-18 20:41:01.716964+00	\N
add43a9a-f6d1-4794-8de4-cb72bb746044	\N	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	message	Dev Super Admin: 👍 Got it	f	2026-08-19 08:10:44.797462+00	\N
46dde37e-c5bd-4147-bfe1-2c2038828c67	0b70bbcc-85c7-4934-bd79-4c14b575b15b	\N	record_opened	Dev Super Admin opened lead 0b70bbcc-85c7-4934-bd79-4c14b575b15b	f	2026-08-19 14:08:00.896398+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
0eda868e-cb77-42b9-a6e7-d82a0d42d9c0	7a8eb954-1485-4683-b4de-641ff66af140	\N	record_opened	Dev Super Admin opened lead 7a8eb954-1485-4683-b4de-641ff66af140	f	2026-08-19 16:43:50.832754+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
35840ef7-aa64-4f7f-8d7c-7b475c5aaf52	7a8eb954-1485-4683-b4de-641ff66af140	\N	record_opened	Dev Super Admin opened lead 7a8eb954-1485-4683-b4de-641ff66af140	f	2026-08-19 16:44:03.406356+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
f95c5078-f442-4767-9f4d-c9af22a04d9a	7a8eb954-1485-4683-b4de-641ff66af140	\N	record_opened	Dev Super Admin opened lead 7a8eb954-1485-4683-b4de-641ff66af140	f	2026-08-19 16:56:02.004473+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
935f6d95-8f63-495f-bd53-9e64c423b826	7a8eb954-1485-4683-b4de-641ff66af140	\N	record_opened	Dev Super Admin opened lead 7a8eb954-1485-4683-b4de-641ff66af140	f	2026-08-19 16:56:08.235693+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
8fdc99d2-aa68-489a-8184-b7ae55bba96f	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 16:57:27.93014+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
caf55b2f-e464-40fb-ae86-2d7472e01510	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 16:58:10.208474+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
4aca7400-94f4-459a-8c0c-dc639e9e14c7	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 16:58:28.859665+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
756da1d1-0e61-4bb8-a9d8-dbf51d289d12	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 16:58:33.042854+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
104dc34c-81be-4fe0-acb4-3b908c9ec02d	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 17:00:41.768842+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
0edb5b81-dcc5-4a14-8edc-512b0bdcb364	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 17:01:29.852422+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
ac8cb8f6-fb16-424d-bef3-46c43c505657	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 17:01:32.204406+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
116780e6-99d8-4224-981c-55d8e958eff5	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 17:05:07.221396+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
5140b89e-ecad-4b08-9d3e-27b844853703	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 17:05:11.791099+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
5ec3aeb7-e806-43c7-a370-eea5d0b8f535	7590aa2e-16ba-4096-a11f-016ceee5f059	\N	record_opened	Dev Super Admin opened lead 7590aa2e-16ba-4096-a11f-016ceee5f059	f	2026-08-19 17:05:15.511685+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
3f68cb61-c0c9-46a0-abbf-34ad231dbd80	7a8eb954-1485-4683-b4de-641ff66af140	\N	record_opened	Dev Super Admin opened lead 7a8eb954-1485-4683-b4de-641ff66af140	f	2026-08-19 17:05:21.55079+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
4bf3fea1-30b2-4b2c-93a2-cf5573a5b10f	7590aa2e-16ba-4096-a11f-016ceee5f059	\N	record_opened	Dev Super Admin opened lead 7590aa2e-16ba-4096-a11f-016ceee5f059	f	2026-08-19 17:05:22.560633+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
8eda3768-2b3c-4101-9c71-7a1ce62aa32b	7590aa2e-16ba-4096-a11f-016ceee5f059	\N	record_opened	Dev Super Admin opened lead 7590aa2e-16ba-4096-a11f-016ceee5f059	f	2026-08-19 17:05:28.610666+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
4feb67fa-2d35-41ed-9163-47c3986e88a4	7590aa2e-16ba-4096-a11f-016ceee5f059	\N	record_opened	Dev Super Admin opened lead 7590aa2e-16ba-4096-a11f-016ceee5f059	f	2026-08-19 17:05:31.133505+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
ea09cb9d-2463-425e-bf6c-7ea1b845cb71	7590aa2e-16ba-4096-a11f-016ceee5f059	\N	record_opened	Dev Super Admin opened lead 7590aa2e-16ba-4096-a11f-016ceee5f059	f	2026-08-19 17:06:09.978523+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
d5f0dcb5-9495-472c-9342-5cc933e8a377	5a8c400b-e6fe-449b-b850-58d0b05dbda8	\N	record_opened	Dev Super Admin opened lead 5a8c400b-e6fe-449b-b850-58d0b05dbda8	f	2026-08-19 17:06:37.170013+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
748cb0fa-b456-453b-9d45-2da6344c5bda	5a8c400b-e6fe-449b-b850-58d0b05dbda8	\N	record_opened	Dev Super Admin opened lead 5a8c400b-e6fe-449b-b850-58d0b05dbda8	f	2026-08-19 17:06:42.40435+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
50178549-67a3-4833-87b9-7d75972bcb0c	3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	\N	record_opened	Dev Super Admin opened lead 3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	f	2026-08-19 17:07:31.008029+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
4e939b75-d3b2-4f15-9d4a-8af0b1ac8e90	3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	\N	record_opened	Dev Super Admin opened lead 3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	f	2026-08-19 17:07:33.798363+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
bb5b3b37-8209-4883-870e-c4d0e573f7fb	3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	\N	record_opened	Dev Super Admin opened lead 3a8a0ad1-8be0-4630-8c51-fb6243f78fa9	f	2026-08-19 17:09:59.155952+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
4152921a-8a3d-4908-a7eb-b8d7fe1d668f	\N	ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	message	Dev Super Admin: 🙏 Thanks!	f	2026-08-19 17:11:05.731641+00	\N
c05908c8-93bc-4ac5-ad24-9615ba36308a	f0d0d12f-5bf9-4006-accf-48685285ce94	\N	record_opened	Dev Super Admin opened lead f0d0d12f-5bf9-4006-accf-48685285ce94	f	2026-08-19 17:12:39.287758+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
c53283c0-a10e-43a4-9693-6109f4e371cd	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 17:19:14.991317+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
ffc569ad-0c39-481b-9806-6d3a4686c721	57654d18-2234-4048-977e-71345c99cd68	\N	record_opened	Dev Super Admin opened lead 57654d18-2234-4048-977e-71345c99cd68	f	2026-08-19 17:19:17.537541+00	f8b8b0a0-1514-4452-90d3-0b492fe852cb
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_transactions (id, lead_id, prepaid_amount, pay_at_counter_amount, card_last_four, card_token, outcome, processed_by, processed_at, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, code, description, category, created_at) FROM stdin;
d400938f-4301-4438-87a7-60140b352384	leads.view_all	View all leads	Leads	2026-08-18 20:32:48.301192+00
654e2b57-3722-40f2-bdef-faedcd5a9cb0	leads.view_own	View own assigned leads	Leads	2026-08-18 20:32:48.301192+00
bdb234f9-6f97-4758-a22e-56974f7f29ed	leads.create	Create leads and bookings	Leads	2026-08-18 20:32:48.301192+00
ae0444c5-bf09-418f-8822-0ba3bba24ce6	billing.charge_card	Process card charges and declines	Billing	2026-08-18 20:32:48.301192+00
453b3e8c-2733-4738-8495-28e9002f4bdc	dashboard.qc_stats	View QC queue stats on the dashboard	Dashboard	2026-08-18 20:32:48.301192+00
5dbab258-06a9-4123-86de-d36e2b368455	dashboard.billing_stats	View billing queue stats on the dashboard	Dashboard	2026-08-18 20:32:48.301192+00
dec5376e-9948-45a4-b4d6-669d915fdfd7	dashboard.revenue_stats	View company-wide revenue on the dashboard	Dashboard	2026-08-18 20:32:48.301192+00
63529c98-5c16-4b95-b1e3-1409e4fe1a97	dashboard.system_stats	View system-wide stats (users, integrations)	Dashboard	2026-08-18 20:32:48.301192+00
af62ac16-cb8c-4076-9c47-bf41aeaba9e6	modifications.manage	Record and view booking modifications	Modifications	2026-08-18 20:32:48.301192+00
a828fb01-c366-4db2-91ed-4ec0068b6271	cancellations.manage	Cancel bookings	Cancellations	2026-08-18 20:32:48.301192+00
9bc3b64f-fb7b-4731-88f0-1548d1c862d4	future_credits.create	Issue future credits	Future Credits	2026-08-18 20:32:48.301192+00
935bc337-aca6-4d57-aab5-af478edf7880	future_credits.view	View the future credits ledger	Future Credits	2026-08-18 20:32:48.301192+00
50fbe9f2-af19-4eb9-aad1-b5308d8f96e4	audit.view	View process/PII/access audit logs	Audit	2026-08-18 20:32:48.301192+00
5aaf000d-b877-491a-9fd7-cbfc57f0baa2	integrations.manage	Manage external integration API keys	Integrations	2026-08-18 20:32:48.301192+00
894de6c7-b97b-4154-8d2d-09a495d43463	admin.manage_users	Create and edit users	Admin	2026-08-18 20:32:48.301192+00
47192ce5-0b26-40f4-9be8-64b923e1cbc3	admin.view_settings	View system settings	Admin	2026-08-18 20:32:48.301192+00
9e897628-3d86-4eb4-a75a-016a8289a073	admin.manage_settings	Edit system settings	Admin	2026-08-18 20:32:48.301192+00
fa374a0a-7bbd-416d-a3c5-a6a51cd7fbf3	admin.manage_roles	Create/edit roles and permissions	Admin	2026-08-18 20:32:48.301192+00
e9c1d6f5-0e20-40e0-af51-69cce87be0fa	admin.manage_custom_fields	Define custom form fields	Admin	2026-08-18 20:32:48.301192+00
60ab4d3d-cc9b-45f5-97b6-aa240f18e16e	admin.view_activity_log	View the activity log	Admin	2026-08-18 20:32:48.301192+00
1960d0ef-aefb-4a36-87cf-bf57850cb2a8	attendance.view_all	View every user's attendance, not just your own	Attendance	2026-08-19 19:47:03.366613+00
5c441622-b848-4622-a282-b33641cfa2ae	files.view_all	Browse every user's uploaded files, not just your own	Files	2026-08-19 19:47:03.366613+00
\.


--
-- Data for Name: pii_reveal_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pii_reveal_audit_log (id, lead_id, agent_id, field_revealed, reason, ip_address, user_agent, revealed_at) FROM stdin;
902e856a-337c-4e70-b121-fbb6bdb9c0b6	3fd31619-366c-40f6-a104-1d7e46a528bb	87a4b8b0-763c-4633-9f59-623d53ecd5a8	phone	res	100.26.21.254	node	2026-08-18 18:44:42.553613+00
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
6c5e77e7-11a6-4082-84cb-f990359d943e	d400938f-4301-4438-87a7-60140b352384
6c5e77e7-11a6-4082-84cb-f990359d943e	654e2b57-3722-40f2-bdef-faedcd5a9cb0
6c5e77e7-11a6-4082-84cb-f990359d943e	bdb234f9-6f97-4758-a22e-56974f7f29ed
6c5e77e7-11a6-4082-84cb-f990359d943e	ae0444c5-bf09-418f-8822-0ba3bba24ce6
6c5e77e7-11a6-4082-84cb-f990359d943e	453b3e8c-2733-4738-8495-28e9002f4bdc
6c5e77e7-11a6-4082-84cb-f990359d943e	5dbab258-06a9-4123-86de-d36e2b368455
6c5e77e7-11a6-4082-84cb-f990359d943e	dec5376e-9948-45a4-b4d6-669d915fdfd7
6c5e77e7-11a6-4082-84cb-f990359d943e	63529c98-5c16-4b95-b1e3-1409e4fe1a97
6c5e77e7-11a6-4082-84cb-f990359d943e	af62ac16-cb8c-4076-9c47-bf41aeaba9e6
6c5e77e7-11a6-4082-84cb-f990359d943e	a828fb01-c366-4db2-91ed-4ec0068b6271
6c5e77e7-11a6-4082-84cb-f990359d943e	9bc3b64f-fb7b-4731-88f0-1548d1c862d4
6c5e77e7-11a6-4082-84cb-f990359d943e	935bc337-aca6-4d57-aab5-af478edf7880
6c5e77e7-11a6-4082-84cb-f990359d943e	50fbe9f2-af19-4eb9-aad1-b5308d8f96e4
6c5e77e7-11a6-4082-84cb-f990359d943e	5aaf000d-b877-491a-9fd7-cbfc57f0baa2
6c5e77e7-11a6-4082-84cb-f990359d943e	894de6c7-b97b-4154-8d2d-09a495d43463
6c5e77e7-11a6-4082-84cb-f990359d943e	47192ce5-0b26-40f4-9be8-64b923e1cbc3
6c5e77e7-11a6-4082-84cb-f990359d943e	9e897628-3d86-4eb4-a75a-016a8289a073
6c5e77e7-11a6-4082-84cb-f990359d943e	fa374a0a-7bbd-416d-a3c5-a6a51cd7fbf3
6c5e77e7-11a6-4082-84cb-f990359d943e	e9c1d6f5-0e20-40e0-af51-69cce87be0fa
6c5e77e7-11a6-4082-84cb-f990359d943e	60ab4d3d-cc9b-45f5-97b6-aa240f18e16e
f8b8b0a0-1514-4452-90d3-0b492fe852cb	d400938f-4301-4438-87a7-60140b352384
f8b8b0a0-1514-4452-90d3-0b492fe852cb	bdb234f9-6f97-4758-a22e-56974f7f29ed
f8b8b0a0-1514-4452-90d3-0b492fe852cb	453b3e8c-2733-4738-8495-28e9002f4bdc
f8b8b0a0-1514-4452-90d3-0b492fe852cb	5dbab258-06a9-4123-86de-d36e2b368455
f8b8b0a0-1514-4452-90d3-0b492fe852cb	dec5376e-9948-45a4-b4d6-669d915fdfd7
f8b8b0a0-1514-4452-90d3-0b492fe852cb	63529c98-5c16-4b95-b1e3-1409e4fe1a97
f8b8b0a0-1514-4452-90d3-0b492fe852cb	af62ac16-cb8c-4076-9c47-bf41aeaba9e6
f8b8b0a0-1514-4452-90d3-0b492fe852cb	a828fb01-c366-4db2-91ed-4ec0068b6271
f8b8b0a0-1514-4452-90d3-0b492fe852cb	9bc3b64f-fb7b-4731-88f0-1548d1c862d4
f8b8b0a0-1514-4452-90d3-0b492fe852cb	935bc337-aca6-4d57-aab5-af478edf7880
f8b8b0a0-1514-4452-90d3-0b492fe852cb	50fbe9f2-af19-4eb9-aad1-b5308d8f96e4
f8b8b0a0-1514-4452-90d3-0b492fe852cb	5aaf000d-b877-491a-9fd7-cbfc57f0baa2
f8b8b0a0-1514-4452-90d3-0b492fe852cb	894de6c7-b97b-4154-8d2d-09a495d43463
f8b8b0a0-1514-4452-90d3-0b492fe852cb	47192ce5-0b26-40f4-9be8-64b923e1cbc3
f8b8b0a0-1514-4452-90d3-0b492fe852cb	e9c1d6f5-0e20-40e0-af51-69cce87be0fa
f8b8b0a0-1514-4452-90d3-0b492fe852cb	60ab4d3d-cc9b-45f5-97b6-aa240f18e16e
7ac48eda-1501-4b90-848c-5fa44c93bb0d	654e2b57-3722-40f2-bdef-faedcd5a9cb0
7ac48eda-1501-4b90-848c-5fa44c93bb0d	bdb234f9-6f97-4758-a22e-56974f7f29ed
a715e07a-8d7b-4f1b-8588-477d217d0132	ae0444c5-bf09-418f-8822-0ba3bba24ce6
a715e07a-8d7b-4f1b-8588-477d217d0132	5dbab258-06a9-4123-86de-d36e2b368455
a715e07a-8d7b-4f1b-8588-477d217d0132	935bc337-aca6-4d57-aab5-af478edf7880
2de01a3e-60f9-429a-9c4c-939845589542	d400938f-4301-4438-87a7-60140b352384
2de01a3e-60f9-429a-9c4c-939845589542	453b3e8c-2733-4738-8495-28e9002f4bdc
2de01a3e-60f9-429a-9c4c-939845589542	5dbab258-06a9-4123-86de-d36e2b368455
2de01a3e-60f9-429a-9c4c-939845589542	dec5376e-9948-45a4-b4d6-669d915fdfd7
2de01a3e-60f9-429a-9c4c-939845589542	9bc3b64f-fb7b-4731-88f0-1548d1c862d4
2de01a3e-60f9-429a-9c4c-939845589542	935bc337-aca6-4d57-aab5-af478edf7880
12c011cb-5269-42d8-aa6e-9823a458769d	453b3e8c-2733-4738-8495-28e9002f4bdc
12c011cb-5269-42d8-aa6e-9823a458769d	935bc337-aca6-4d57-aab5-af478edf7880
2e9e3a3f-d538-4cfe-9821-f8fe6f96a858	af62ac16-cb8c-4076-9c47-bf41aeaba9e6
2e9e3a3f-d538-4cfe-9821-f8fe6f96a858	a828fb01-c366-4db2-91ed-4ec0068b6271
2e9e3a3f-d538-4cfe-9821-f8fe6f96a858	9bc3b64f-fb7b-4731-88f0-1548d1c862d4
2e9e3a3f-d538-4cfe-9821-f8fe6f96a858	935bc337-aca6-4d57-aab5-af478edf7880
d9eaf10e-37c6-4f54-9318-6760627c8d94	af62ac16-cb8c-4076-9c47-bf41aeaba9e6
d9eaf10e-37c6-4f54-9318-6760627c8d94	a828fb01-c366-4db2-91ed-4ec0068b6271
d9eaf10e-37c6-4f54-9318-6760627c8d94	935bc337-aca6-4d57-aab5-af478edf7880
58f9f87d-341e-4814-9aa0-dde146ac4bba	935bc337-aca6-4d57-aab5-af478edf7880
6c5e77e7-11a6-4082-84cb-f990359d943e	1960d0ef-aefb-4a36-87cf-bf57850cb2a8
f8b8b0a0-1514-4452-90d3-0b492fe852cb	1960d0ef-aefb-4a36-87cf-bf57850cb2a8
2de01a3e-60f9-429a-9c4c-939845589542	1960d0ef-aefb-4a36-87cf-bf57850cb2a8
6c5e77e7-11a6-4082-84cb-f990359d943e	5c441622-b848-4622-a282-b33641cfa2ae
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, is_system_role, created_by, created_at) FROM stdin;
6c5e77e7-11a6-4082-84cb-f990359d943e	super_admin	t	\N	2026-08-18 20:32:48.301192+00
f8b8b0a0-1514-4452-90d3-0b492fe852cb	admin	t	\N	2026-08-18 20:32:48.301192+00
7ac48eda-1501-4b90-848c-5fa44c93bb0d	agent	t	\N	2026-08-18 20:32:48.301192+00
a715e07a-8d7b-4f1b-8588-477d217d0132	billing	t	\N	2026-08-18 20:32:48.301192+00
2de01a3e-60f9-429a-9c4c-939845589542	tl	t	\N	2026-08-18 20:32:48.301192+00
12c011cb-5269-42d8-aa6e-9823a458769d	auditor	t	\N	2026-08-18 20:32:48.301192+00
2e9e3a3f-d538-4cfe-9821-f8fe6f96a858	cs	t	\N	2026-08-18 20:32:48.301192+00
d9eaf10e-37c6-4f54-9318-6760627c8d94	change_dep	t	\N	2026-08-18 20:32:48.301192+00
58f9f87d-341e-4814-9aa0-dde146ac4bba	chargeback_dep	t	\N	2026-08-18 20:32:48.301192+00
ae3e3b57-fc50-4850-a23d-1fc0cee7efb0	cr_booking	t	\N	2026-08-18 20:32:48.301192+00
\.


--
-- Data for Name: status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.status_history (id, lead_id, from_status, to_status, changed_by, changed_at) FROM stdin;
d34eff62-0c80-4de5-9a28-2a67b0b7df14	6c07443d-6bdb-47b1-87ed-e65618455fec	authorization_pending	client_approved	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 16:54:50.760304+00
\.


--
-- Data for Name: status_lookup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.status_lookup (status, label, ui_color, sort_order) FROM stdin;
authorization_pending	Authorization Pending	grey	1
client_approved	Client Approved	blue	2
transferred_to_billing	Transferred to Billing	purple	3
card_charged	Card Charged	green	4
card_declined	Card Declined	red	5
tag_change_dep	Tag to Change Dep	yellow	6
tag_cr_booking	Tag to CR Booking	orange	7
tag_auditor	Tag to Auditor	cyan	8
qc_done	QC Done	dark_green	9
tag_refund	Tag Refund	red	10
tag_rdr	Tag RDR	black	11
tag_chargeback	Tag Chargeback	black	12
\.


--
-- Data for Name: status_role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.status_role_permissions (status, role_id, kind) FROM stdin;
transferred_to_billing	7ac48eda-1501-4b90-848c-5fa44c93bb0d	set_by
transferred_to_billing	6c5e77e7-11a6-4082-84cb-f990359d943e	set_by
transferred_to_billing	f8b8b0a0-1514-4452-90d3-0b492fe852cb	set_by
card_charged	a715e07a-8d7b-4f1b-8588-477d217d0132	set_by
card_declined	a715e07a-8d7b-4f1b-8588-477d217d0132	set_by
tag_change_dep	6c5e77e7-11a6-4082-84cb-f990359d943e	set_by
tag_change_dep	f8b8b0a0-1514-4452-90d3-0b492fe852cb	set_by
tag_change_dep	a715e07a-8d7b-4f1b-8588-477d217d0132	set_by
tag_change_dep	2de01a3e-60f9-429a-9c4c-939845589542	set_by
tag_change_dep	12c011cb-5269-42d8-aa6e-9823a458769d	set_by
tag_change_dep	2e9e3a3f-d538-4cfe-9821-f8fe6f96a858	set_by
tag_change_dep	d9eaf10e-37c6-4f54-9318-6760627c8d94	set_by
tag_change_dep	58f9f87d-341e-4814-9aa0-dde146ac4bba	set_by
tag_change_dep	ae3e3b57-fc50-4850-a23d-1fc0cee7efb0	set_by
tag_cr_booking	6c5e77e7-11a6-4082-84cb-f990359d943e	set_by
tag_cr_booking	f8b8b0a0-1514-4452-90d3-0b492fe852cb	set_by
tag_cr_booking	a715e07a-8d7b-4f1b-8588-477d217d0132	set_by
tag_cr_booking	2de01a3e-60f9-429a-9c4c-939845589542	set_by
tag_cr_booking	12c011cb-5269-42d8-aa6e-9823a458769d	set_by
tag_cr_booking	2e9e3a3f-d538-4cfe-9821-f8fe6f96a858	set_by
tag_cr_booking	d9eaf10e-37c6-4f54-9318-6760627c8d94	set_by
tag_cr_booking	58f9f87d-341e-4814-9aa0-dde146ac4bba	set_by
tag_cr_booking	ae3e3b57-fc50-4850-a23d-1fc0cee7efb0	set_by
tag_auditor	6c5e77e7-11a6-4082-84cb-f990359d943e	set_by
tag_auditor	f8b8b0a0-1514-4452-90d3-0b492fe852cb	set_by
tag_auditor	a715e07a-8d7b-4f1b-8588-477d217d0132	set_by
tag_auditor	2de01a3e-60f9-429a-9c4c-939845589542	set_by
tag_auditor	12c011cb-5269-42d8-aa6e-9823a458769d	set_by
tag_auditor	2e9e3a3f-d538-4cfe-9821-f8fe6f96a858	set_by
tag_auditor	d9eaf10e-37c6-4f54-9318-6760627c8d94	set_by
tag_auditor	58f9f87d-341e-4814-9aa0-dde146ac4bba	set_by
tag_auditor	ae3e3b57-fc50-4850-a23d-1fc0cee7efb0	set_by
qc_done	12c011cb-5269-42d8-aa6e-9823a458769d	set_by
tag_refund	a715e07a-8d7b-4f1b-8588-477d217d0132	set_by
tag_rdr	a715e07a-8d7b-4f1b-8588-477d217d0132	set_by
tag_chargeback	a715e07a-8d7b-4f1b-8588-477d217d0132	set_by
client_approved	f8b8b0a0-1514-4452-90d3-0b492fe852cb	notifies
transferred_to_billing	a715e07a-8d7b-4f1b-8588-477d217d0132	notifies
card_charged	7ac48eda-1501-4b90-848c-5fa44c93bb0d	notifies
card_declined	7ac48eda-1501-4b90-848c-5fa44c93bb0d	notifies
tag_change_dep	d9eaf10e-37c6-4f54-9318-6760627c8d94	notifies
tag_cr_booking	ae3e3b57-fc50-4850-a23d-1fc0cee7efb0	notifies
tag_auditor	12c011cb-5269-42d8-aa6e-9823a458769d	notifies
tag_auditor	f8b8b0a0-1514-4452-90d3-0b492fe852cb	notifies
qc_done	7ac48eda-1501-4b90-848c-5fa44c93bb0d	notifies
qc_done	f8b8b0a0-1514-4452-90d3-0b492fe852cb	notifies
tag_refund	a715e07a-8d7b-4f1b-8588-477d217d0132	notifies
tag_rdr	a715e07a-8d7b-4f1b-8588-477d217d0132	notifies
tag_rdr	58f9f87d-341e-4814-9aa0-dde146ac4bba	notifies
tag_chargeback	a715e07a-8d7b-4f1b-8588-477d217d0132	notifies
tag_chargeback	58f9f87d-341e-4814-9aa0-dde146ac4bba	notifies
transferred_to_billing	a715e07a-8d7b-4f1b-8588-477d217d0132	relevant
card_charged	a715e07a-8d7b-4f1b-8588-477d217d0132	relevant
card_declined	a715e07a-8d7b-4f1b-8588-477d217d0132	relevant
tag_change_dep	d9eaf10e-37c6-4f54-9318-6760627c8d94	relevant
tag_cr_booking	ae3e3b57-fc50-4850-a23d-1fc0cee7efb0	relevant
tag_auditor	12c011cb-5269-42d8-aa6e-9823a458769d	relevant
qc_done	12c011cb-5269-42d8-aa6e-9823a458769d	relevant
tag_refund	a715e07a-8d7b-4f1b-8588-477d217d0132	relevant
tag_rdr	a715e07a-8d7b-4f1b-8588-477d217d0132	relevant
tag_rdr	58f9f87d-341e-4814-9aa0-dde146ac4bba	relevant
tag_chargeback	a715e07a-8d7b-4f1b-8588-477d217d0132	relevant
tag_chargeback	58f9f87d-341e-4814-9aa0-dde146ac4bba	relevant
\.


--
-- Data for Name: user_whitelisted_ips; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_whitelisted_ips (id, user_id, ip_address, label, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, ip_whitelist_enabled, is_active, created_by, created_at, updated_at, role_id) FROM stdin;
87a4b8b0-763c-4633-9f59-623d53ecd5a8	Dev Super Admin	dev-admin@example.com	$2b$12$iN1vcQIcmb4NMcOFQXm/ueLpXP0O.n1GOB3KaB2IJhmZoJ26Yw/lG	f	t	\N	2026-08-18 03:23:12.332692+00	2026-08-18 03:23:12.332692+00	6c5e77e7-11a6-4082-84cb-f990359d943e
2d9c46e3-168b-4bf0-93eb-bb8664075de4	Test Agent	agent1@example.com	$2b$12$KkfYA8pG7D9O5TgLEwjhau2QKjqV9b29qXxdx9LElJrQ9BWRTOHGO	f	t	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 03:23:39.451594+00	2026-08-18 03:23:39.451594+00	7ac48eda-1501-4b90-848c-5fa44c93bb0d
ac3e6da0-df2f-4ce5-966a-fd75cfcb0ae9	Billing Bot	billing-bot@example.com	$2b$12$JOHnYF.3K6O2UYgkLYeEVu1zt21jmgJAt0gyWfm8szzQzO4Ny8K6i	f	t	87a4b8b0-763c-4633-9f59-623d53ecd5a8	2026-08-18 03:23:40.122431+00	2026-08-18 03:23:40.122431+00	a715e07a-8d7b-4f1b-8588-477d217d0132
\.


--
-- Name: access_notification_log access_notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_notification_log
    ADD CONSTRAINT access_notification_log_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_user_id_work_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_user_id_work_date_key UNIQUE (user_id, work_date);


--
-- Name: authorization_records authorization_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_records
    ADD CONSTRAINT authorization_records_pkey PRIMARY KEY (id);


--
-- Name: booking_modifications booking_modifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_modifications
    ADD CONSTRAINT booking_modifications_pkey PRIMARY KEY (id);


--
-- Name: booking_process_log booking_process_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_process_log
    ADD CONSTRAINT booking_process_log_pkey PRIMARY KEY (id);


--
-- Name: cancellations cancellations_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellations
    ADD CONSTRAINT cancellations_lead_id_key UNIQUE (lead_id);


--
-- Name: cancellations cancellations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellations
    ADD CONSTRAINT cancellations_pkey PRIMARY KEY (id);


--
-- Name: car_bookings car_bookings_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_bookings
    ADD CONSTRAINT car_bookings_lead_id_key UNIQUE (lead_id);


--
-- Name: car_bookings car_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_bookings
    ADD CONSTRAINT car_bookings_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, user_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: custom_field_definitions custom_field_definitions_entity_type_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_entity_type_key_key UNIQUE (entity_type, key);


--
-- Name: custom_field_definitions custom_field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_pkey PRIMARY KEY (id);


--
-- Name: embed_widgets embed_widgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embed_widgets
    ADD CONSTRAINT embed_widgets_pkey PRIMARY KEY (id);


--
-- Name: embed_widgets embed_widgets_widget_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embed_widgets
    ADD CONSTRAINT embed_widgets_widget_key_key UNIQUE (widget_key);


--
-- Name: file_share_events file_share_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_share_events
    ADD CONSTRAINT file_share_events_pkey PRIMARY KEY (id);


--
-- Name: file_share_links file_share_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_share_links
    ADD CONSTRAINT file_share_links_pkey PRIMARY KEY (id);


--
-- Name: file_share_links file_share_links_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_share_links
    ADD CONSTRAINT file_share_links_token_key UNIQUE (token);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: flight_bookings flight_bookings_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_bookings
    ADD CONSTRAINT flight_bookings_lead_id_key UNIQUE (lead_id);


--
-- Name: flight_bookings flight_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_bookings
    ADD CONSTRAINT flight_bookings_pkey PRIMARY KEY (id);


--
-- Name: future_credits future_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_credits
    ADD CONSTRAINT future_credits_pkey PRIMARY KEY (id);


--
-- Name: google_sheets_sync_status google_sheets_sync_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_sheets_sync_status
    ADD CONSTRAINT google_sheets_sync_status_pkey PRIMARY KEY (id);


--
-- Name: hotel_bookings hotel_bookings_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_lead_id_key UNIQUE (lead_id);


--
-- Name: hotel_bookings hotel_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_pkey PRIMARY KEY (id);


--
-- Name: lead_access_grants lead_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_access_grants
    ADD CONSTRAINT lead_access_grants_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: master_field_options master_field_options_field_key_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_field_options
    ADD CONSTRAINT master_field_options_field_key_value_key UNIQUE (field_key, value);


--
-- Name: master_field_options master_field_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_field_options
    ADD CONSTRAINT master_field_options_pkey PRIMARY KEY (id);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- Name: message_mentions message_mentions_message_id_mentioned_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_message_id_mentioned_user_id_key UNIQUE (message_id, mentioned_user_id);


--
-- Name: message_mentions message_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: pii_reveal_audit_log pii_reveal_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_reveal_audit_log
    ADD CONSTRAINT pii_reveal_audit_log_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: status_history status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history
    ADD CONSTRAINT status_history_pkey PRIMARY KEY (id);


--
-- Name: status_lookup status_lookup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_lookup
    ADD CONSTRAINT status_lookup_pkey PRIMARY KEY (status);


--
-- Name: status_role_permissions status_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_role_permissions
    ADD CONSTRAINT status_role_permissions_pkey PRIMARY KEY (status, role_id, kind);


--
-- Name: user_whitelisted_ips user_whitelisted_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_whitelisted_ips
    ADD CONSTRAINT user_whitelisted_ips_pkey PRIMARY KEY (id);


--
-- Name: user_whitelisted_ips user_whitelisted_ips_user_id_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_whitelisted_ips
    ADD CONSTRAINT user_whitelisted_ips_user_id_ip_address_key UNIQUE (user_id, ip_address);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_access_log_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_log_lead ON public.access_notification_log USING btree (lead_id);


--
-- Name: idx_api_keys_prefix; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_prefix ON public.api_keys USING btree (key_prefix);


--
-- Name: idx_auth_records_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_records_lead ON public.authorization_records USING btree (lead_id);


--
-- Name: idx_booking_mods_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_mods_lead ON public.booking_modifications USING btree (lead_id);


--
-- Name: idx_conv_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_participants_user ON public.conversation_participants USING btree (user_id);


--
-- Name: idx_future_credits_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_future_credits_source ON public.future_credits USING btree (source_lead_id);


--
-- Name: idx_lead_access_grants_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_access_grants_lead ON public.lead_access_grants USING btree (lead_id);


--
-- Name: idx_leads_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_agent_id ON public.leads USING btree (agent_id);


--
-- Name: idx_leads_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_email ON public.leads USING btree (email);


--
-- Name: idx_leads_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_name_trgm ON public.leads USING gin (name public.gin_trgm_ops);


--
-- Name: idx_leads_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_phone ON public.leads USING btree (phone);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_message_attachments_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_attachments_message ON public.message_attachments USING btree (message_id);


--
-- Name: idx_message_mentions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_mentions_user ON public.message_mentions USING btree (mentioned_user_id);


--
-- Name: idx_messages_conversation_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_created ON public.messages USING btree (conversation_id, created_at);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_user_id, is_read);


--
-- Name: idx_payments_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_lead ON public.payment_transactions USING btree (lead_id);


--
-- Name: idx_pii_log_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pii_log_lead ON public.pii_reveal_audit_log USING btree (lead_id);


--
-- Name: idx_process_log_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_log_lead ON public.booking_process_log USING btree (lead_id);


--
-- Name: idx_sheets_sync_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sheets_sync_status ON public.google_sheets_sync_status USING btree (status);


--
-- Name: idx_status_history_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_history_lead ON public.status_history USING btree (lead_id);


--
-- Name: ix_activity_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_activity_log_actor ON public.activity_log USING btree (actor_id, created_at DESC);


--
-- Name: ix_activity_log_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_activity_log_category ON public.activity_log USING btree (category, created_at DESC);


--
-- Name: ix_attendance_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_user_date ON public.attendance_records USING btree (user_id, work_date DESC);


--
-- Name: ix_embed_widgets_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_embed_widgets_key ON public.embed_widgets USING btree (widget_key);


--
-- Name: ix_file_share_events_link; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_share_events_link ON public.file_share_events USING btree (share_link_id, event_type);


--
-- Name: ix_file_share_links_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_share_links_file ON public.file_share_links USING btree (file_id);


--
-- Name: ix_files_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_files_uploaded_by ON public.files USING btree (uploaded_by, created_at DESC);


--
-- Name: ix_notes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notes_user ON public.notes USING btree (user_id, updated_at DESC);


--
-- Name: ix_status_role_permissions_role_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_status_role_permissions_role_kind ON public.status_role_permissions USING btree (role_id, kind);


--
-- Name: access_notification_log access_notification_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_notification_log
    ADD CONSTRAINT access_notification_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: access_notification_log access_notification_log_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_notification_log
    ADD CONSTRAINT access_notification_log_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.users(id);


--
-- Name: activity_log activity_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: api_keys api_keys_assigned_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: app_settings app_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: attendance_records attendance_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: authorization_records authorization_records_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorization_records
    ADD CONSTRAINT authorization_records_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: booking_modifications booking_modifications_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_modifications
    ADD CONSTRAINT booking_modifications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: booking_modifications booking_modifications_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_modifications
    ADD CONSTRAINT booking_modifications_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES public.users(id);


--
-- Name: booking_process_log booking_process_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_process_log
    ADD CONSTRAINT booking_process_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: booking_process_log booking_process_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_process_log
    ADD CONSTRAINT booking_process_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: cancellations cancellations_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellations
    ADD CONSTRAINT cancellations_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: cancellations cancellations_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellations
    ADD CONSTRAINT cancellations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: car_bookings car_bookings_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_bookings
    ADD CONSTRAINT car_bookings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: custom_field_definitions custom_field_definitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: embed_widgets embed_widgets_assigned_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embed_widgets
    ADD CONSTRAINT embed_widgets_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.users(id);


--
-- Name: embed_widgets embed_widgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embed_widgets
    ADD CONSTRAINT embed_widgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: file_share_events file_share_events_share_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_share_events
    ADD CONSTRAINT file_share_events_share_link_id_fkey FOREIGN KEY (share_link_id) REFERENCES public.file_share_links(id) ON DELETE CASCADE;


--
-- Name: file_share_links file_share_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_share_links
    ADD CONSTRAINT file_share_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: file_share_links file_share_links_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_share_links
    ADD CONSTRAINT file_share_links_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE;


--
-- Name: files files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: flight_bookings flight_bookings_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flight_bookings
    ADD CONSTRAINT flight_bookings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: future_credits future_credits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_credits
    ADD CONSTRAINT future_credits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: future_credits future_credits_source_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_credits
    ADD CONSTRAINT future_credits_source_lead_id_fkey FOREIGN KEY (source_lead_id) REFERENCES public.leads(id);


--
-- Name: google_sheets_sync_status google_sheets_sync_status_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_sheets_sync_status
    ADD CONSTRAINT google_sheets_sync_status_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: hotel_bookings hotel_bookings_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_access_grants lead_access_grants_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_access_grants
    ADD CONSTRAINT lead_access_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: lead_access_grants lead_access_grants_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_access_grants
    ADD CONSTRAINT lead_access_grants_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_access_grants lead_access_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_access_grants
    ADD CONSTRAINT lead_access_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: leads leads_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: leads leads_duplicate_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_duplicate_of_id_fkey FOREIGN KEY (duplicate_of_id) REFERENCES public.leads(id);


--
-- Name: leads leads_embed_widget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_embed_widget_id_fkey FOREIGN KEY (embed_widget_id) REFERENCES public.embed_widgets(id) ON DELETE SET NULL;


--
-- Name: master_field_options master_field_options_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_field_options
    ADD CONSTRAINT master_field_options_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_attachments message_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: message_mentions message_mentions_mentioned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES public.users(id);


--
-- Name: message_mentions message_mentions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT message_mentions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notes notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_role_id_fkey FOREIGN KEY (recipient_role_id) REFERENCES public.roles(id);


--
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id);


--
-- Name: payment_transactions payment_transactions_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: pii_reveal_audit_log pii_reveal_audit_log_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_reveal_audit_log
    ADD CONSTRAINT pii_reveal_audit_log_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: pii_reveal_audit_log pii_reveal_audit_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_reveal_audit_log
    ADD CONSTRAINT pii_reveal_audit_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: roles roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: status_history status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history
    ADD CONSTRAINT status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: status_history status_history_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_history
    ADD CONSTRAINT status_history_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: status_role_permissions status_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_role_permissions
    ADD CONSTRAINT status_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: status_role_permissions status_role_permissions_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_role_permissions
    ADD CONSTRAINT status_role_permissions_status_fkey FOREIGN KEY (status) REFERENCES public.status_lookup(status) ON DELETE CASCADE;


--
-- Name: user_whitelisted_ips user_whitelisted_ips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_whitelisted_ips
    ADD CONSTRAINT user_whitelisted_ips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict svUN4flKn6oh6h7RCJYXVBIWKIV4wMcvi3C204486jKIViumR6FzLJzhgUdOAQ8

