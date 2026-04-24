import { format } from 'date-fns';
import { Nurse, NurseRoster, ShiftType, StaffGroupId } from '../types';
import { STAFF_GROUP_LABELS } from '../constants';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PAGE_SLUG = import.meta.env.VITE_SUPABASE_PAGE_SLUG || 'main-roster';

const GROUP_NAME_TO_ID = Object.entries(STAFF_GROUP_LABELS).reduce((acc, [key, value]) => {
  acc[value] = key as StaffGroupId;
  return acc;
}, {} as Record<string, StaffGroupId>);

const UI_TO_DB_SHIFT: Record<ShiftType, string> = {
  GD: 'D',
  GN: 'N',
  M: 'M',
  T: 'T',
  L: 'L',
  V: 'VAC',
  O: 'O',
};

const DB_TO_UI_SHIFT: Record<string, ShiftType | null> = {
  D: 'GD',
  N: 'GN',
  M: 'M',
  T: 'T',
  L: 'L',
  VAC: 'V',
  LIC: 'V',
  O: 'O',
};

type StaffMemberRow = {
  full_name: string;
  group_name: string;
  sort_order: number;
};

type LeaveEntryRow = {
  staff_name: string;
  leave_code: string;
  start_date: string;
  end_date: string;
};

type AssignmentRow = {
  staff_name: string;
  work_date: string;
  shift_code: string;
};

type MonthlyPlanRow = {
  month_key: string;
};

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: getHeaders(options.headers as Record<string, string>),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\blic\.\s*/g, '')
    .replace(/\btec\.\s*/g, '')
    .replace(/\s+/g, ' ');
}

function inferRole(groupId: StaffGroupId, fallback?: Nurse['role']): Nurse['role'] {
  if (fallback) {
    return fallback;
  }

  if (groupId === 'SUPERVISORA') {
    return 'Supervisora';
  }

  if (groupId.startsWith('TEC')) {
    return 'Técnico';
  }

  return 'Licenciada';
}

function mapGroupNameToId(groupName: string, fallback?: StaffGroupId): StaffGroupId {
  return GROUP_NAME_TO_ID[groupName] || fallback || 'LIC_NOMBRADOS';
}

function createNurseId(name: string, index: number) {
  return `${normalizeName(name).replace(/[^a-z0-9]+/g, '-')}-${index}`;
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function insertChunked(table: string, rows: unknown[]) {
  for (const part of chunk(rows, 500)) {
    await request(`${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(part),
    });
  }
}

export async function loadFromSupabase(currentDate: Date, fallbackNurses: Nurse[]) {
  if (!isConfigured()) {
    return {
      configured: false,
      nurses: fallbackNurses,
      status: 'Supabase is not configured yet.',
    };
  }

  const monthKey = format(currentDate, 'yyyy-MM');
  const fallbackByName = new Map(fallbackNurses.map((nurse) => [normalizeName(nurse.name), nurse]));

  const [staffRows, leaveRows, assignmentRows, planRows] = await Promise.all([
    request<StaffMemberRow[]>(
      `staff_members?select=full_name,group_name,sort_order&page_slug=eq.${encodeURIComponent(PAGE_SLUG)}&active=eq.true&order=sort_order.asc`
    ),
    request<LeaveEntryRow[]>(
      `leave_entries?select=staff_name,leave_code,start_date,end_date&page_slug=eq.${encodeURIComponent(PAGE_SLUG)}&order=start_date.asc`
    ),
    request<AssignmentRow[]>(
      `roster_assignments?select=staff_name,work_date,shift_code&page_slug=eq.${encodeURIComponent(PAGE_SLUG)}&month_key=eq.${monthKey}`
    ),
    request<MonthlyPlanRow[]>(
      `monthly_plans?select=month_key&page_slug=eq.${encodeURIComponent(PAGE_SLUG)}&month_key=eq.${monthKey}&limit=1`
    ),
  ]);

  if (!staffRows.length) {
    return {
      configured: true,
      nurses: fallbackNurses,
      status: 'Supabase connected. No remote staff data yet, using local defaults.',
    };
  }

  const nurses = staffRows.map((row, index) => {
    const fallback = fallbackByName.get(normalizeName(row.full_name));
    const groupId = mapGroupNameToId(row.group_name, fallback?.groupId);
    return {
      id: fallback?.id || createNurseId(row.full_name, index),
      name: row.full_name,
      role: inferRole(groupId, fallback?.role),
      groupId,
      teamId: fallback?.teamId ?? (row.sort_order % 5),
      vacations: [],
      hiringDate: fallback?.hiringDate || '2020-01-01',
      overrides: {},
    } satisfies Nurse;
  });

  const nurseByName = new Map(nurses.map((nurse) => [normalizeName(nurse.name), nurse]));

  leaveRows.forEach((entry) => {
    const nurse = nurseByName.get(normalizeName(entry.staff_name));
    if (!nurse) {
      return;
    }

    if (entry.leave_code === 'O') {
      const start = new Date(`${entry.start_date}T00:00:00`);
      const end = new Date(`${entry.end_date}T00:00:00`);
      for (let date = start; date <= end; date = new Date(date.getTime() + 86400000)) {
        nurse.overrides = nurse.overrides || {};
        nurse.overrides[format(date, 'yyyy-MM-dd')] = 'O';
      }
      return;
    }

    nurse.vacations.push({
      start: entry.start_date,
      end: entry.end_date,
    });
  });

  assignmentRows.forEach((entry) => {
    const nurse = nurseByName.get(normalizeName(entry.staff_name));
    const mappedShift = DB_TO_UI_SHIFT[entry.shift_code];
    if (!nurse || !mappedShift) {
      return;
    }

    if (mappedShift === 'V') {
      return;
    }

    nurse.overrides = nurse.overrides || {};
    nurse.overrides[entry.work_date] = mappedShift;
  });

  return {
    configured: true,
    nurses,
    status: planRows.length
      ? `Supabase connected. Loaded saved data for ${monthKey}.`
      : 'Supabase connected. Loaded staff and leave data.',
  };
}

export async function saveToSupabase(currentDate: Date, nurses: Nurse[], roster: NurseRoster[]) {
  if (!isConfigured()) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const monthKey = format(currentDate, 'yyyy-MM');

  await request('roster_pages?on_conflict=page_slug', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([
      {
        page_slug: PAGE_SLUG,
        display_name: 'Hospithro',
      },
    ]),
  });

  await request(`personnel_groups?page_slug=eq.${encodeURIComponent(PAGE_SLUG)}`, { method: 'DELETE' });
  await request(`staff_members?page_slug=eq.${encodeURIComponent(PAGE_SLUG)}`, { method: 'DELETE' });
  await request(`leave_entries?page_slug=eq.${encodeURIComponent(PAGE_SLUG)}`, { method: 'DELETE' });
  await request(`roster_assignments?page_slug=eq.${encodeURIComponent(PAGE_SLUG)}&month_key=eq.${monthKey}`, { method: 'DELETE' });

  const uniqueGroups = Array.from(new Set(nurses.map((nurse) => nurse.groupId)));
  const groupRows = uniqueGroups.map((groupId, index) => ({
    page_slug: PAGE_SLUG,
    name: STAFF_GROUP_LABELS[groupId],
    sort_order: index,
  }));
  await insertChunked('personnel_groups', groupRows);

  const staffRows = nurses.map((nurse, index) => ({
    page_slug: PAGE_SLUG,
    group_name: STAFF_GROUP_LABELS[nurse.groupId],
    full_name: nurse.name,
    sort_order: index,
    active: true,
  }));
  await insertChunked('staff_members', staffRows);

  const leaveRows = nurses.flatMap((nurse) => [
    ...nurse.vacations.map((range) => ({
      page_slug: PAGE_SLUG,
      staff_name: nurse.name,
      leave_code: 'VAC',
      start_date: range.start,
      end_date: range.end,
    })),
    ...Object.entries(nurse.overrides || {})
      .filter(([, shift]) => shift === 'O')
      .map(([date]) => ({
        page_slug: PAGE_SLUG,
        staff_name: nurse.name,
        leave_code: 'O',
        start_date: date,
        end_date: date,
      })),
  ]);

  if (leaveRows.length) {
    await insertChunked('leave_entries', leaveRows);
  }

  await request('monthly_plans?on_conflict=page_slug,month_key', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([
      {
        page_slug: PAGE_SLUG,
        month_key: monthKey,
        target_hours: 144,
        shift_hours: 12,
        day_coverage: 4,
        night_coverage: 4,
        morning_coverage: 0,
        afternoon_coverage: 0,
      },
    ]),
  });

  const assignmentRows = roster.flatMap((item) =>
    item.days.map((day) => ({
      page_slug: PAGE_SLUG,
      month_key: monthKey,
      staff_name: item.nurse.name,
      group_name: STAFF_GROUP_LABELS[item.nurse.groupId],
      work_date: day.date,
      shift_code: UI_TO_DB_SHIFT[day.shift],
    }))
  );
  await insertChunked('roster_assignments', assignmentRows);

  return {
    monthKey,
    staffCount: nurses.length,
    assignmentCount: assignmentRows.length,
  };
}
