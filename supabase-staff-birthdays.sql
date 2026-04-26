alter table public.staff_members
  add column if not exists birth_date date;
