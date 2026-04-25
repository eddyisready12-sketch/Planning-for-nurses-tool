alter table public.roster_assignments
  add column if not exists scheduled_shift_code text;

alter table public.roster_assignments
  add column if not exists credited_hours integer not null default 0;

create or replace view public.staff_monthly_summary as
select
  page_slug,
  month_key,
  staff_name,
  group_name,
  count(*) filter (where shift_code in ('D', 'N', 'M', 'T')) as worked_shifts,
  count(*) filter (where shift_code = 'VAC') as vacation_days,
  count(*) filter (where shift_code = 'VAC' and credited_hours > 0) as vacation_work_days,
  count(*) filter (where shift_code = 'LIC') as license_days,
  count(*) filter (where shift_code = 'O') as special_days,
  count(*) filter (where shift_code = 'L') as off_days,
  count(*) filter (where shift_code in ('D', 'N', 'M', 'T')) * coalesce(mp.shift_hours, 12) as worked_hours,
  coalesce(sum(credited_hours) filter (where shift_code = 'VAC'), 0) as vacation_hours,
  count(*) filter (where shift_code = 'LIC') * coalesce(mp.shift_hours, 12) as license_hours,
  count(*) filter (where shift_code = 'O') * coalesce(mp.shift_hours, 12) as special_hours,
  count(*) filter (where shift_code = 'L') * coalesce(mp.shift_hours, 12) as off_hours
from public.roster_assignments ra
left join public.monthly_plans mp
  on mp.page_slug = ra.page_slug
 and mp.month_key = ra.month_key
group by
  ra.page_slug,
  ra.month_key,
  ra.staff_name,
  ra.group_name,
  mp.shift_hours;
