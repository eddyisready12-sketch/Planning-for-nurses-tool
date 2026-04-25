alter table public.staff_members
  add column if not exists team_id integer not null default 0;
