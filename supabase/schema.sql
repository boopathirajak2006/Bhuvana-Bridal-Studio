-- ==============================================================================
-- Bhuvana's Bridal Studio (Salem) — Supabase Database Schema & Security
-- ==============================================================================
-- Migration / Setup Script for:
-- 1. Secure Role-Based Access Control (Admin authorization via separate table)
-- 2. Bookings Table with Validation & Status Pipeline
-- 3. Services / Packages Table with Active Status & Initial Seed Data
-- 4. Calendar Blocked Dates Table for Availability Checking
-- 5. Row Level Security (RLS) Policies protecting all private customer data
-- ==============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ROLE-BASED ACCESS CONTROL (RBAC)
-- ------------------------------------------------------------------------------
-- Customers CANNOT self-assign admin roles because this table has no public insert/update,
-- and RLS ensures user_roles can only be managed by existing admins or direct SQL.
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (user_id, role)
);

create index if not exists idx_user_roles_user on public.user_roles (user_id);

-- Security Definer function to check if current user is an admin
-- Runs with owner privileges to safely inspect public.user_roles
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- Security Definer function to check if current user is admin or staff
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'staff')
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. UPDATED_AT TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. BOOKINGS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text unique not null,
  client_name text not null check (length(trim(client_name)) >= 2),
  mobile text not null check (length(trim(mobile)) >= 10),
  email text,
  event_date date not null,
  makeup_date date,
  location text not null check (length(trim(location)) >= 2),
  people_count int not null default 1 check (people_count >= 1 and people_count <= 50),
  services text[] default '{}',
  preferences text[] default '{}',
  message text,
  booking_category text default 'bridal-beauty',
  whatsapp_number text,
  full_address text,
  preferred_contact text default 'WhatsApp',
  whatsapp_consent boolean default false,
  event_name text,
  event_type text,
  event_time text,
  getting_ready_time text,
  venue_name text,
  venue_address text,
  function_location text,
  service_details jsonb default '{}'::jsonb,
  customization_preferences jsonb default '{}'::jsonb,
  reference_images text[] default '{}',
  poster_url text,
  poster_public_id text,
  rejection_reason text,
  rejection_notes text,
  customer_name text,
  customer_mobile text,
  customer_email text,
  event_location text,
  booking_status text default 'pending',
  status text not null default 'pending' check (status in ('draft', 'pending', 'confirmed', 'completed', 'declined', 'cancelled')),
  deposit_amount numeric(10,2) default 0.00 check (deposit_amount >= 0),
  total_quote numeric(10,2) default 0.00 check (total_quote >= 0),
  admin_notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Backward compatibility column additions for existing tables
alter table public.bookings add column if not exists booking_category text default 'bridal-beauty';
alter table public.bookings add column if not exists whatsapp_number text;
alter table public.bookings add column if not exists full_address text;
alter table public.bookings add column if not exists preferred_contact text default 'WhatsApp';
alter table public.bookings add column if not exists whatsapp_consent boolean default false;
alter table public.bookings add column if not exists event_name text;
alter table public.bookings add column if not exists event_type text;
alter table public.bookings add column if not exists event_time text;
alter table public.bookings add column if not exists getting_ready_time text;
alter table public.bookings add column if not exists venue_name text;
alter table public.bookings add column if not exists venue_address text;
alter table public.bookings add column if not exists function_location text;
alter table public.bookings add column if not exists service_details jsonb default '{}'::jsonb;
alter table public.bookings add column if not exists customization_preferences jsonb default '{}'::jsonb;
alter table public.bookings add column if not exists reference_images text[] default '{}';
alter table public.bookings add column if not exists poster_url text;
alter table public.bookings add column if not exists poster_public_id text;
alter table public.bookings add column if not exists rejection_reason text;
alter table public.bookings add column if not exists rejection_notes text;
alter table public.bookings add column if not exists customer_name text;
alter table public.bookings add column if not exists customer_mobile text;
alter table public.bookings add column if not exists customer_email text;
alter table public.bookings add column if not exists event_location text;
alter table public.bookings add column if not exists booking_status text default 'pending';

-- Indexes for fast filtering and searching in the admin dashboard
create index if not exists idx_bookings_status on public.bookings (status);
create index if not exists idx_bookings_event_date on public.bookings (event_date);
create index if not exists idx_bookings_makeup_date on public.bookings (makeup_date);
create index if not exists idx_bookings_created_at on public.bookings (created_at desc);
create index if not exists idx_bookings_mobile on public.bookings (mobile);

-- Trigger to automatically generate unique human-readable booking reference (e.g., BBS-2610-8F2A)
create or replace function public.generate_booking_ref()
returns trigger
language plpgsql
as $$
declare
  prefix text;
  rand text;
begin
  if new.booking_ref is null or length(trim(new.booking_ref)) = 0 then
    prefix := 'BBS-' || to_char(coalesce(new.event_date, current_date), 'YYMM');
    rand := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    new.booking_ref := prefix || '-' || rand;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_booking_ref on public.bookings;
create trigger trg_bookings_booking_ref
  before insert on public.bookings
  for each row
  execute function public.generate_booking_ref();

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. SERVICES & PACKAGES TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('package', 'individual')),
  title text not null check (length(trim(title)) >= 2),
  ideal_for text,
  starting_price numeric(10,2) not null check (starting_price >= 0),
  inclusions text[],
  exclusions text[],
  display_order int default 0,
  is_active boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_services_active on public.services (is_active, display_order);

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
  before update on public.services
  for each row
  execute function public.set_updated_at();

-- Seed initial packages and starting rates from the existing website
insert into public.services (category, title, ideal_for, starting_price, inclusions, display_order, is_active)
values
  ('package', 'Bridal Makeup', 'Ideal for brides who know the look they want.', 8000, array['Wedding-day bridal makeup (HD or airbrush)', 'Skin prep and false lashes', 'Touch-up kit guidance'], 1, true),
  ('package', 'Bridal Trial + Wedding Day', 'Ideal for brides who want certainty before the day.', 12000, array['Full trial session with look refinement', 'Wedding-day bridal makeup', 'Hairstyling and draping'], 2, true),
  ('package', 'Bride + Family / Bridesmaids', 'Ideal for wedding parties getting ready together.', 18000, array['Bridal makeup plus family or bridesmaid faces', 'Coordinated timeline for the morning', 'Assistant on larger parties'], 3, true),
  ('individual', 'Bridal makeup (HD / airbrush)', null, 8000, array['HD or airbrush camera-ready finish'], 4, true),
  ('individual', 'Bridal trial', null, 2000, array['Full trial session with look refinement'], 5, true),
  ('individual', 'Engagement makeup', null, 5000, array['Engagement ceremony makeup and styling'], 6, true),
  ('individual', 'Reception makeup', null, 6000, array['Glamorous evening reception makeup'], 7, true),
  ('individual', 'Family / bridesmaid makeup (per person)', null, 2500, array['Event-ready makeup per person'], 8, true),
  ('individual', 'Hairstyling', null, 1500, array['Bridal or event hair styling'], 9, true),
  ('individual', 'Draping', null, 800, array['Traditional or contemporary saree draping'], 10, true)
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 5. BLOCKED DATES (Calendar Availability)
-- ------------------------------------------------------------------------------
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  reason text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_blocked_dates_date on public.blocked_dates (date);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
alter table public.user_roles enable row level security;
alter table public.bookings enable row level security;
alter table public.services enable row level security;
alter table public.blocked_dates enable row level security;

-- ------------------------------------------------------------------------------
-- A. Policies for user_roles
-- ------------------------------------------------------------------------------
-- Strictly restricted: Only confirmed admins can view roles. Public and regular users cannot view or edit.
create policy "Admins can view all user roles"
  on public.user_roles
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can manage user roles"
  on public.user_roles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------------------
-- B. Policies for bookings
-- ------------------------------------------------------------------------------
-- 1. Public Insertion: Anonymous visitors can submit enquiries, but only with status='pending'.
-- They cannot read existing bookings or modify any records.
create policy "Public can submit booking enquiries"
  on public.bookings
  for insert
  to anon, authenticated
  with check (
    status in ('pending', 'draft')
    and length(trim(coalesce(client_name, customer_name, ''))) >= 2
    and length(trim(coalesce(mobile, customer_mobile, ''))) >= 10
  );

-- 2. Admin Access: Authenticated admins can view, update, and manage all bookings.
create policy "Admins can view all bookings"
  on public.bookings
  for select
  to authenticated
  using (public.is_staff());

create policy "Admins can update bookings"
  on public.bookings
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "Admins can delete bookings"
  on public.bookings
  for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- C. Policies for services
-- ------------------------------------------------------------------------------
-- Anyone (public or authenticated) can view active services and starting prices
create policy "Public can view active services"
  on public.services
  for select
  to anon, authenticated
  using (is_active = true);

-- Admins can view all (including inactive) and modify services
create policy "Admins can manage services"
  on public.services
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------------------
-- D. Policies for blocked_dates
-- ------------------------------------------------------------------------------
-- Public can check blocked dates to show availability on calendar
create policy "Public can view blocked dates"
  on public.blocked_dates
  for select
  to anon, authenticated
  using (true);

-- Admins can add or remove blocked dates
create policy "Admins can manage blocked dates"
  on public.blocked_dates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ==============================================================================
-- BOOTSTRAP INSTRUCTION FOR STUDIO OWNER:
-- To grant the first admin access after signing up in Supabase Auth:
-- Run this single SQL statement in the Supabase SQL Editor:
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<YOUR_SUPABASE_AUTH_USER_UUID>', 'admin');
-- ==============================================================================
