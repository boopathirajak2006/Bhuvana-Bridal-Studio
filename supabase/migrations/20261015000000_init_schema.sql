-- Migration: 20261015000000_init_schema.sql
-- Bhuvana's Bridal Studio Initial Schema & RLS Policies

-- Enable required extensions
create extension if not exists "pgcrypto";

-- User Roles for Secure RBAC
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (user_id, role)
);

create index if not exists idx_user_roles_user on public.user_roles (user_id);

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Bookings table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text unique not null,
  client_name text not null check (length(trim(client_name)) >= 2),
  mobile text not null check (length(trim(mobile)) >= 10),
  email text,
  event_date date not null,
  makeup_date date not null,
  location text not null check (length(trim(location)) >= 2),
  people_count int not null default 1 check (people_count >= 1 and people_count <= 50),
  services text[] not null check (array_length(services, 1) >= 1),
  preferences text[] not null check (array_length(preferences, 1) >= 1),
  message text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'declined', 'cancelled')),
  deposit_amount numeric(10,2) default 0.00 check (deposit_amount >= 0),
  total_quote numeric(10,2) default 0.00 check (total_quote >= 0),
  admin_notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_bookings_status on public.bookings (status);
create index if not exists idx_bookings_event_date on public.bookings (event_date);
create index if not exists idx_bookings_makeup_date on public.bookings (makeup_date);
create index if not exists idx_bookings_created_at on public.bookings (created_at desc);
create index if not exists idx_bookings_mobile on public.bookings (mobile);

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

-- Services table
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

-- Blocked Dates table
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  reason text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_blocked_dates_date on public.blocked_dates (date);

-- Enable RLS
alter table public.user_roles enable row level security;
alter table public.bookings enable row level security;
alter table public.services enable row level security;
alter table public.blocked_dates enable row level security;

-- RLS Policies
create policy "Admins can view all user roles"
  on public.user_roles for select to authenticated
  using (public.is_admin());

create policy "Admins can manage user roles"
  on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Public can submit booking enquiries"
  on public.bookings for insert to anon, authenticated
  with check (
    status = 'pending'
    and length(trim(client_name)) >= 2
    and length(trim(mobile)) >= 10
    and length(trim(location)) >= 2
    and array_length(services, 1) >= 1
    and array_length(preferences, 1) >= 1
  );

create policy "Admins can view all bookings"
  on public.bookings for select to authenticated
  using (public.is_staff());

create policy "Admins can update bookings"
  on public.bookings for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "Admins can delete bookings"
  on public.bookings for delete to authenticated
  using (public.is_admin());

create policy "Public can view active services"
  on public.services for select to anon, authenticated
  using (is_active = true);

create policy "Admins can manage services"
  on public.services for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Public can view blocked dates"
  on public.blocked_dates for select to anon, authenticated
  using (true);

create policy "Admins can manage blocked dates"
  on public.blocked_dates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
