import { addDays, eachDayOfInterval, endOfYear, format, parseISO, startOfYear } from 'date-fns';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { Nurse, NurseRoster, ShiftType, StaffGroupId } from '../types';
import { SHIFT_HOURS, STAFF_GROUP_LABELS } from '../constants';
import { getShiftForDate } from './roster-logic';

const ANNUAL_VACATION_DAYS = 25;
const ANNUAL_VACATION_HOURS = ANNUAL_VACATION_DAYS * 12;

type StoredSupabaseConfig = {
  url?: string;
  anonKey?: string;
  pageSlug?: string;
};

export type SupabaseConnectionSummary = {
  url: string;
  anonKey: string;
  pageSlug: string;
  configured: boolean;
};

type RealtimeSubscriptionHandle = {
  unsubscribe: () => void;
};

function getStoredConfig(): StoredSupabaseConfig {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem('hospithro.supabase.config') || '{}') as StoredSupabaseConfig;
  } catch {
    return {};
  }
}

function getSupabaseConfig() {
  const stored = getStoredConfig();

  return {
    url: import.meta.env.VITE_SUPABASE_URL || stored.url || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || stored.anonKey || '',
    pageSlug: import.meta.env.VITE_SUPABASE_PAGE_SLUG || stored.pageSlug || 'main-roster',
  };
}

let realtimeClient: ReturnType<typeof createClient> | null = null;
let realtimeClientKey = '';

function getRealtimeClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  const nextKey = `${url}|${anonKey}`;
  if (!realtimeClient || realtimeClientKey !== nextKey) {
    realtimeClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    realtimeClientKey = nextKey;
  }

  return realtimeClient;
}

export function getSupabaseConnectionSummary(): SupabaseConnectionSummary {
  const config = getSupabaseConfig();
  return {
    ...config,
    configured: Boolean(config.url && config.anonKey),
  };
}

export function saveSupabaseBrowserConfig(config: StoredSupabaseConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextConfig: StoredSupabaseConfig = {
    url: config.url?.trim(),
    anonKey: config.anonKey?.trim(),
    pageSlug: config.pageSlug?.trim() || 'main-roster',
  };

  window.localStorage.setItem('hospithro.supabase.config', JSON.stringify(nextConfig));
}

export function clearSupabaseBrowserConfig() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem('hospithro.supabase.config');
}

export function subscribeToSupabaseChanges(
  currentDate: Date,
  onChange: () => void
): RealtimeSubscriptionHandle | null {
  const client = getRealtimeClient();
  if (!client) {
    return null;
  }

  const { pageSlug } = getSupabaseConfig();
  const monthKey = format(currentDate, 'yyyy-MM');

  const channel = client.channel(`hospithro-live:${pageSlug}:${monthKey}:${Date.now()}`);
  const notifyTables = ['staff_members', 'leave_entries', 'personnel_groups', 'monthly_plans', 'staff_vacation_balances'];

  notifyTables.forEach((table) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `page_slug=eq.${pageSlug}`,
      },
      () => onChange()
    );
  });

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'roster_assignments',
    },
    (payload) => {
      const record = (payload.new as { roster_type?: string; page_slug?: string; month_key?: string } | null)
        || (payload.old as { roster_type?: string; page_slug?: string; month_key?: string } | null);
      const recordRosterType = record?.roster_type || record?.page_slug;
      if (recordRosterType && recordRosterType !== pageSlug) {
        return;
      }

      const monthFromRecord =
        (payload.new as { month_key?: string } | null)?.month_key ||
        (payload.old as { month_key?: string } | null)?.month_key;

      if (!monthFromRecord || monthFromRecord === monthKey) {
        onChange();
      }
    }
  );

  channel.subscribe();

  return {
    unsubscribe: () => {
      void client.removeChannel(channel);
    },
  };
}

const GROUP_NAME_TO_ID = Object.entries(STAFF_GROUP_LABELS).reduce((acc, [key, value]) => {
  acc[value] = key as StaffGroupId;
  return acc;
}, {} as Record<string, StaffGroupId>);

const UI_TO_DB_SHIFT: Record<ShiftType, string> = {
  D: 'D',
  N: 'N',
  M: 'M',
  T: 'T',
  MT: 'MT',
  L: 'L',
  VAC: 'VAC',
  LIC: 'LIC',
  O: 'O',
};

const DB_TO_UI_SHIFT: Record<string, ShiftType | null> = {
  D: 'D',
  N: 'N',
  M: 'M',
  T: 'T',
  MT: 'MT',
  L: 'L',
  VAC: 'VAC',
  LIC: 'LIC',
  O: 'O',
};

type StaffMemberRow = {
  full_name: string;
  group_name: string;
  sort_order: number;
  team_id?: number | null;
  active?: boolean | null;
  birth_date?: string | null;
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
  scheduled_shift_code?: string;
};

type MonthlyPlanRow = {
  month_key: string;
};

function isConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

function getHeaders(extra: Record<string, string> = {}) {
  const { anonKey } = getSupabaseConfig();

  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/${path}`, {
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

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\blic\.\s*/g, '')
    .replace(/\btec\.\s*/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeDbDateToLocalDate(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed.slice(0, 10);
  }

  return format(parsed, 'yyyy-MM-dd');
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

function inferGroupFromName(name: string, groupId: StaffGroupId): StaffGroupId {
  const trimmedName = name.trim().toUpperCase();
  const isTec = trimmedName.startsWith('TEC.');
  const isLic = trimmedName.startsWith('LIC.');

  if (isTec && groupId === 'LIC_NOMBRADOS') {
    return 'TEC_NOMBRADOS';
  }

  if (isTec && groupId === 'LIC_CAS') {
    return 'TEC_CAS';
  }

  if (isLic && groupId === 'TEC_NOMBRADOS') {
    return 'LIC_NOMBRADOS';
  }

  if (isLic && groupId === 'TEC_CAS') {
    return 'LIC_CAS';
  }

  return groupId;
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

function appendVacationRange(nurse: Nurse, start: string, end: string) {
  const exists = nurse.vacations.some((range) => range.start === start && range.end === end);
  if (!exists) {
    nurse.vacations.push({ start, end });
  }
}

function normalizeVacationRanges(ranges: Nurse['vacations']) {
  if (!ranges.length) {
    return [];
  }

  const sortedRanges = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
  const normalized: Nurse['vacations'] = [];

  sortedRanges.forEach((range) => {
    const currentStart = parseISO(range.start);
    const currentEnd = parseISO(range.end);
    const previous = normalized[normalized.length - 1];

    if (!previous) {
      normalized.push({ start: range.start, end: range.end });
      return;
    }

    const previousEnd = parseISO(previous.end);
    const previousEndPlusOne = addDays(previousEnd, 1);

    if (currentStart <= previousEndPlusOne) {
      if (currentEnd > previousEnd) {
        previous.end = range.end;
      }
      return;
    }

    normalized.push({ start: range.start, end: range.end });
  });

  return normalized;
}

function buildVacationBalanceRows(currentDate: Date, nurses: Nurse[], pageSlug: string) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const vacationYear = Number(format(currentDate, 'yyyy'));

  return nurses.map((nurse) => {
    const nurseWithoutVacation = {
      ...nurse,
      vacations: [],
      loadedMonthAssignments: undefined,
      overrides: Object.fromEntries(
        Object.entries(nurse.overrides || {}).filter(([, shift]) => shift !== 'VAC')
      ),
    };

    let usedDays = 0;
    let usedHours = 0;

    nurse.vacations.forEach((range) => {
      const start = parseISO(range.start);
      const end = parseISO(range.end);
      const clippedStart = start < yearStart ? yearStart : start;
      const clippedEnd = end > yearEnd ? yearEnd : end;

      if (clippedStart > clippedEnd) {
        return;
      }

      eachDayOfInterval({ start: clippedStart, end: clippedEnd }).forEach((date) => {
        const scheduledShift = getShiftForDate(nurseWithoutVacation, date);
        const scheduledHours = SHIFT_HOURS[scheduledShift];
        if (scheduledShift === 'M' || scheduledShift === 'T') {
          usedDays += 0.5;
        } else if (scheduledShift === 'MT') {
          usedDays += 1;
        } else if (scheduledHours > 0) {
          usedDays += 1;
        }
        usedHours += scheduledHours;
      });
    });

    return {
      page_slug: pageSlug,
      staff_name: nurse.name,
      vacation_year: vacationYear,
      allowance_days: ANNUAL_VACATION_DAYS,
      allowance_hours: ANNUAL_VACATION_HOURS,
      used_days: usedDays,
      used_hours: usedHours,
      remaining_days: Math.max(ANNUAL_VACATION_DAYS - usedDays, 0),
      remaining_hours: Math.max(ANNUAL_VACATION_HOURS - usedHours, 0),
      updated_at: new Date().toISOString(),
    };
  });
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
      status: 'Supabase is not configured yet. Add connection details outside GitHub code.',
    };
  }

  const monthKey = format(currentDate, 'yyyy-MM');
  const { pageSlug } = getSupabaseConfig();
  const fallbackByName = new Map(fallbackNurses.map((nurse) => [normalizeName(nurse.name), nurse]));

  const [staffRows, leaveRows, assignmentRows, planRows] = await Promise.all([
    request<StaffMemberRow[]>(
      `staff_members?select=full_name,group_name,sort_order,team_id,active,birth_date&page_slug=eq.${encodeURIComponent(pageSlug)}&order=sort_order.asc`
    ),
    request<LeaveEntryRow[]>(
      `leave_entries?select=staff_name,leave_code,start_date,end_date&page_slug=eq.${encodeURIComponent(pageSlug)}&order=start_date.asc`
    ),
    request<AssignmentRow[]>(
      `roster_assignments?select=staff_name,work_date,shift_code,scheduled_shift_code&page_slug=eq.${encodeURIComponent(pageSlug)}&month_key=eq.${monthKey}`
    ),
    request<MonthlyPlanRow[]>(
      `monthly_plans?select=month_key&page_slug=eq.${encodeURIComponent(pageSlug)}&month_key=eq.${monthKey}&limit=1`
    ),
  ]);

  if (!staffRows.length) {
    return {
      configured: true,
      nurses: fallbackNurses,
      status: 'Supabase connected. No remote staff data yet, using local defaults.',
    };
  }

  const nurses: Nurse[] = staffRows.map((row, index) => {
    const fallback = fallbackByName.get(normalizeName(row.full_name));
    const mappedGroupId = mapGroupNameToId(row.group_name, fallback?.groupId);
    const groupId = inferGroupFromName(row.full_name, mappedGroupId);
    return {
      id: fallback?.id || createNurseId(row.full_name, index),
      name: row.full_name,
      role: inferRole(groupId, fallback?.role),
      groupId,
      teamId: row.team_id ?? fallback?.teamId ?? (row.sort_order % 5),
      archived: row.active === false,
      birthDate: row.birth_date ?? fallback?.birthDate,
      vacations: [],
      hiringDate: fallback?.hiringDate || '2020-01-01',
      overrides: {},
      loadedMonthAssignments: {},
    } satisfies Nurse;
  });

  const nurseByName = new Map(nurses.map((nurse) => [normalizeName(nurse.name), nurse]));
  console.log('[Hospithro] Staff names in map:', Array.from(nurseByName.keys()));

  // Also create nurse stubs from assignment rows not matched to staff_members
  assignmentRows.forEach((entry) => {
    const key = normalizeName(entry.staff_name);
    if (!nurseByName.has(key)) {
      const stub: Nurse = {
        id: createNurseId(entry.staff_name, nurses.length),
        name: entry.staff_name,
        role: 'Técnico',
        groupId: 'TEC_CAS',
        teamId: 0,
        vacations: [],
        hiringDate: '2020-01-01',
        overrides: {},
        loadedMonthAssignments: {},
      };
      nurses.push(stub);
      nurseByName.set(key, stub);
    }
  });

  leaveRows.forEach((entry) => {
    const nurse = nurseByName.get(normalizeName(entry.staff_name));
    if (!nurse) {
      return;
    }

    const normalizedLeaveCode = String(entry.leave_code || '').trim().toUpperCase();
    const localStartDate = normalizeDbDateToLocalDate(entry.start_date);
    const localEndDate = normalizeDbDateToLocalDate(entry.end_date);

    if (normalizedLeaveCode === 'O' || normalizedLeaveCode === 'LIC') {
      const start = new Date(`${localStartDate}T00:00:00`);
      const end = new Date(`${localEndDate}T00:00:00`);
      for (let date = start; date <= end; date = new Date(date.getTime() + 86400000)) {
        nurse.overrides = nurse.overrides || {};
        nurse.overrides[format(date, 'yyyy-MM-dd')] = normalizedLeaveCode === 'LIC' ? 'LIC' : 'O';
      }
      return;
    }

    appendVacationRange(nurse, localStartDate, localEndDate);
  });

  assignmentRows.forEach((entry) => {
    const nurse = nurseByName.get(normalizeName(entry.staff_name));
    const normalizedShiftCode = String(entry.shift_code || '').trim().toUpperCase();
    const mappedShift = DB_TO_UI_SHIFT[normalizedShiftCode];
    const localWorkDate = normalizeDbDateToLocalDate(entry.work_date);
    if (!nurse || !mappedShift) {
      console.warn('[Hospithro] Skipped row - staff_name:', JSON.stringify(entry.staff_name),
        '| normalized:', normalizeName(entry.staff_name),
        '| in map:', nurseByName.has(normalizeName(entry.staff_name)));
      return;
    }

    if (mappedShift === 'VAC') {
      appendVacationRange(nurse, localWorkDate, localWorkDate);
    }

    nurse.loadedMonthAssignments = nurse.loadedMonthAssignments || {};
    nurse.loadedMonthAssignments[localWorkDate] = mappedShift;
  });

  nurses.forEach((nurse) => {
    nurse.vacations = normalizeVacationRanges(nurse.vacations);
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
    throw new Error('Supabase is not configured. Add it through environment variables or browser storage.');
  }

  const monthKey = format(currentDate, 'yyyy-MM');
  const { pageSlug } = getSupabaseConfig();
  const activeNurses = nurses.filter((nurse) => !nurse.archived);

  await request('roster_pages?on_conflict=page_slug', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([
      {
        page_slug: pageSlug,
        display_name: 'Hospithro',
      },
    ]),
  });

  await request(`personnel_groups?page_slug=eq.${encodeURIComponent(pageSlug)}`, { method: 'DELETE' });
  await request(`staff_members?page_slug=eq.${encodeURIComponent(pageSlug)}`, { method: 'DELETE' });
  await request(`leave_entries?page_slug=eq.${encodeURIComponent(pageSlug)}`, { method: 'DELETE' });
  await request(`roster_assignments?page_slug=eq.${encodeURIComponent(pageSlug)}&month_key=eq.${monthKey}`, { method: 'DELETE' });

  const uniqueGroups = Array.from(new Set(activeNurses.map((nurse) => nurse.groupId)));
  const groupRows = uniqueGroups.map((groupId, index) => ({
    page_slug: pageSlug,
    name: STAFF_GROUP_LABELS[groupId],
    sort_order: index,
  }));
  await insertChunked('personnel_groups', groupRows);

  const staffRows = nurses.map((nurse, index) => ({
    page_slug: pageSlug,
    group_name: STAFF_GROUP_LABELS[nurse.groupId],
    full_name: nurse.name,
    sort_order: index,
    team_id: nurse.teamId,
    active: !nurse.archived,
    birth_date: nurse.birthDate || null,
  }));
  await insertChunked('staff_members', staffRows);

  const leaveRowMap = new Map<string, {
    page_slug: string;
    staff_name: string;
    leave_code: string;
    start_date: string;
    end_date: string;
  }>();

  activeNurses.forEach((nurse) => {
    const normalizedVacationRanges = normalizeVacationRanges([
      ...nurse.vacations,
      ...Object.entries(nurse.overrides || {})
        .filter(([, shift]) => shift === 'VAC')
        .map(([date]) => ({ start: date, end: date })),
    ]);

    normalizedVacationRanges.forEach((range) => {
      const row = {
        page_slug: pageSlug,
        staff_name: nurse.name,
        leave_code: 'VAC',
        start_date: range.start,
        end_date: range.end,
      };
      leaveRowMap.set(`${row.staff_name}|${row.leave_code}|${row.start_date}|${row.end_date}`, row);
    });

    Object.entries(nurse.overrides || {}).forEach(([date, shift]) => {
      if (shift === 'O' || shift === 'LIC') {
        const row = {
          page_slug: pageSlug,
          staff_name: nurse.name,
          leave_code: shift === 'LIC' ? 'LIC' : 'O',
          start_date: date,
          end_date: date,
        };
        leaveRowMap.set(`${row.staff_name}|${row.leave_code}|${row.start_date}|${row.end_date}`, row);
      }
    });
  });

  const leaveRows = Array.from(leaveRowMap.values());

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
        page_slug: pageSlug,
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
    item.days.map((day) => {
      const nurseWithoutVacation = {
        ...item.nurse,
        vacations: [],
        loadedMonthAssignments: undefined,
        overrides: Object.fromEntries(
          Object.entries(item.nurse.overrides || {}).filter(([, shift]) => shift !== 'VAC')
        ),
      };
      const scheduledShift = getShiftForDate(nurseWithoutVacation, parseISO(day.date));

      return {
        page_slug: pageSlug,
        month_key: monthKey,
        staff_name: item.nurse.name,
        group_name: STAFF_GROUP_LABELS[item.nurse.groupId],
        work_date: day.date,
        shift_code: UI_TO_DB_SHIFT[day.shift],
        scheduled_shift_code: UI_TO_DB_SHIFT[scheduledShift],
        credited_hours: day.shift === 'VAC' ? SHIFT_HOURS[scheduledShift] : SHIFT_HOURS[day.shift],
      };
    })
  );
  await insertChunked('roster_assignments', assignmentRows);

  const vacationBalanceRows = buildVacationBalanceRows(currentDate, activeNurses, pageSlug);
  if (vacationBalanceRows.length) {
    await request('staff_vacation_balances?on_conflict=page_slug,staff_name,vacation_year', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(vacationBalanceRows),
    });
  }

  return {
    monthKey,
    staffCount: activeNurses.length,
    assignmentCount: assignmentRows.length,
  };
}

