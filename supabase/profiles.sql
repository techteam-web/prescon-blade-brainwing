-- Run once in the Supabase SQL editor for this project.
-- Stores the profile captured during phone OTP registration.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A verified user may read and write only their own row. There is no admin/service
-- policy here — the app never needs one, and none of this data is meant to be
-- readable by other authenticated users.
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
