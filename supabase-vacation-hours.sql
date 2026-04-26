alter table public.roster_assignments
  add column if not exists scheduled_shift_code text;

alter table public.roster_assignments
  add column if not exists credited_hours integer not null default 0;

create or replace view public.staff_monthly_summary as
select
  ra.page_slug,
  ra.month_key,
  ra.staff_name,
  ra.group_name,
  count(*) filter (where ra.shift_code in ('D', 'N', 'M', 'T', 'MT')) as worked_shifts,
  count(*) filter (where ra.shift_code = 'VAC') as vacation_days,
  count(*) filter (where ra.shift_code = 'VAC' and ra.credited_hours > 0) as vacation_work_days,
  count(*) filter (where ra.shift_code = 'LIC') as license_days,
  count(*) filter (where ra.shift_code = 'O') as special_days,
  count(*) filter (where ra.shift_code = 'L') as off_days,
  coalesce(sum(case when ra.shift_code in ('D', 'N', 'M', 'T', 'MT') then ra.credited_hours else 0 end), 0) as worked_hours,
  coalesce(sum(case when ra.shift_code = 'VAC' then ra.credited_hours else 0 end), 0) as vacation_hours,
  coalesce(sum(case when ra.shift_code = 'LIC' then ra.credited_hours else 0 end), 0) as license_hours,
  coalesce(sum(case when ra.shift_code = 'O' then ra.credited_hours else 0 end), 0) as special_hours,
  coalesce(sum(case when ra.shift_code = 'L' then ra.credited_hours else 0 end), 0) as off_hours,
  coalesce(sum(case
    when ra.scheduled_shift_code = 'D' then 12
    when ra.scheduled_shift_code = 'N' then 12
    when ra.scheduled_shift_code = 'M' then 6
    when ra.scheduled_shift_code = 'T' then 6
    when ra.scheduled_shift_code = 'MT' then 12
    else 0
  end), 0) as planned_hours,
  coalesce(sum(ra.credited_hours), 0) as credited_hours_total,
  coalesce(sum(ra.credited_hours), 0) - coalesce(sum(case
    when ra.scheduled_shift_code = 'D' then 12
    when ra.scheduled_shift_code = 'N' then 12
    when ra.scheduled_shift_code = 'M' then 6
    when ra.scheduled_shift_code = 'T' then 6
    when ra.scheduled_shift_code = 'MT' then 12
    else 0
  end), 0) as balance_hours
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
