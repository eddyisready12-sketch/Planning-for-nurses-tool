create table if not exists public.staff_vacation_balances (
  id bigint generated always as identity primary key,
  page_slug text not null references public.roster_pages(page_slug) on delete cascade,
  staff_name text not null,
  vacation_year integer not null,
  allowance_days integer not null default 25,
  allowance_hours integer not null default 300,
  used_days integer not null default 0,
  used_hours integer not null default 0,
  remaining_days integer not null default 25,
  remaining_hours integer not null default 300,
  updated_at timestamptz not null default now(),
  unique (page_slug, staff_name, vacation_year)
);

alter table public.staff_vacation_balances enable row level security;

drop policy if exists "public read staff_vacation_balances" on public.staff_vacation_balances;
create policy "public read staff_vacation_balances"
on public.staff_vacation_balances
for select
to anon, authenticated
using (true);

drop policy if exists "public write staff_vacation_balances" on public.staff_vacation_balances;
create policy "public write staff_vacation_balances"
on public.staff_vacation_balances
for all
to anon, authenticated
using (true)
with check (true);
