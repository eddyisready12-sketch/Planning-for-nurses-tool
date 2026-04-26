import * as XLSX from 'xlsx';
import { endOfMonth, format } from 'date-fns';
import { Nurse, ShiftType, StaffGroupId, StaffRole } from '../types';

type SheetMerge = {
  s: { r: number; c: number };
  e: { r: number; c: number };
};

export type ExcelImportResult = {
  date: Date;
  nurses: Nurse[];
  warnings: string[];
};

const SPANISH_MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function extractMonthDate(text: string) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  for (const [monthName, monthIndex] of Object.entries(SPANISH_MONTHS)) {
    const match = normalized.match(new RegExp(`${monthName}\\s+(20\\d{2})`));
    if (match) {
      return new Date(Number(match[1]), monthIndex, 1);
    }
  }

  return null;
}

function isStaffRow(value: unknown) {
  return /^(LIC|TEC)\./i.test(String(value ?? '').trim());
}

function inferRole(groupId: StaffGroupId, name: string): StaffRole {
  if (groupId === 'SUPERVISORA') {
    return 'Supervisora';
  }

  if (name.trim().toUpperCase().startsWith('TEC.') || groupId.startsWith('TEC')) {
    return 'Técnico';
  }

  return 'Licenciada';
}

function mapSectionToGroup(
  rowLabel: string,
  currentDiscipline: 'LIC' | 'TEC'
): { nextDiscipline: 'LIC' | 'TEC'; groupId?: StaffGroupId } {
  const normalized = normalizeText(rowLabel);

  if (normalized.includes('TECNICOS CAS UCI GENERAL')) {
    return { nextDiscipline: 'TEC', groupId: 'TEC_CAS' };
  }

  if (normalized.includes('ENFERMERAS CAS UCI GENERAL')) {
    return { nextDiscipline: 'LIC', groupId: 'LIC_CAS' };
  }

  if (normalized.includes('UNIDAD DE CUIDADOS INTENSIVOS - TECNICOS EN ENFERMERIA')) {
    return { nextDiscipline: 'TEC' };
  }

  if (normalized.includes('UNIDAD DE CUIDADOS INTENSIVOS - LICENCIADAS EN ENFERMERIA')) {
    return { nextDiscipline: 'LIC' };
  }

  if (normalized === 'NOMBRADOS') {
    return {
      nextDiscipline: currentDiscipline,
      groupId: currentDiscipline === 'TEC' ? 'TEC_NOMBRADOS' : 'LIC_NOMBRADOS',
    };
  }

  if (normalized === 'SUPERVISORA') {
    return { nextDiscipline: 'LIC', groupId: 'SUPERVISORA' };
  }

  if (normalized === 'REEMPLAZO') {
    return { nextDiscipline: currentDiscipline, groupId: 'REEMPLAZO' };
  }

  if (normalized === 'DESTACADO') {
    return { nextDiscipline: 'TEC', groupId: 'DESTACADO' };
  }

  return { nextDiscipline: currentDiscipline };
}

function getSingleShiftCode(value: string): ShiftType | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (normalized === 'GD') {
    return 'GD';
  }

  // In this workbook, plain "D" is descanso/rest day, not a worked day shift.
  if (normalized === 'D') {
    return 'L';
  }

  if (normalized === 'N' || normalized === 'GN') {
    return 'GN';
  }

  if (normalized === 'M') {
    return 'M';
  }

  if (normalized === 'T') {
    return 'T';
  }

  if (normalized === 'O') {
    return 'O';
  }

  if (normalized === 'L' || normalized === '-') {
    return 'L';
  }

  return null;
}

function combineShiftCodes(topValue: string, bottomValue: string): ShiftType | null {
  const topShift = getSingleShiftCode(topValue);
  const bottomShift = getSingleShiftCode(bottomValue);

  if (!topShift && !bottomShift) {
    return null;
  }

  if (topShift === 'M' && bottomShift === 'T') {
    return 'MT';
  }

  if (topShift === 'T' && bottomShift === 'M') {
    return 'MT';
  }

  if (topShift && !bottomShift) {
    return topShift;
  }

  if (!topShift && bottomShift) {
    return bottomShift;
  }

  if (topShift === 'O' && bottomShift) {
    return bottomShift;
  }

  if (bottomShift === 'O' && topShift) {
    return topShift;
  }

  return topShift || bottomShift;
}

function inferGroupFromName(name: string, fallbackGroup: StaffGroupId) {
  const normalized = name.trim().toUpperCase();
  if (normalized.startsWith('TEC.')) {
    if (fallbackGroup === 'LIC_NOMBRADOS') {
      return 'TEC_NOMBRADOS';
    }
    if (fallbackGroup === 'LIC_CAS') {
      return 'TEC_CAS';
    }
  }

  if (normalized.startsWith('LIC.')) {
    if (fallbackGroup === 'TEC_NOMBRADOS') {
      return 'LIC_NOMBRADOS';
    }
    if (fallbackGroup === 'TEC_CAS') {
      return 'LIC_CAS';
    }
  }

  return fallbackGroup;
}

export function importRosterWorkbook(fileBuffer: ArrayBuffer, fallbackDate: Date): ExcelImportResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];
  const merges = ((worksheet['!merges'] || []) as SheetMerge[]);

  let detectedDate: Date | null = null;
  let currentDiscipline: 'LIC' | 'TEC' = 'LIC';
  let currentGroupId: StaffGroupId = 'LIC_NOMBRADOS';
  const nurses: Nurse[] = [];
  const warnings: string[] = [];
  const groupCounters: Record<StaffGroupId, number> = {
    LIC_NOMBRADOS: 0,
    LIC_CAS: 0,
    TEC_NOMBRADOS: 0,
    TEC_CAS: 0,
    SUPERVISORA: 0,
    DESTACADO: 0,
    REEMPLAZO: 0,
  };

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const rowText = row.map((cell) => String(cell ?? '')).join(' ');
    detectedDate ||= extractMonthDate(rowText);

    const sectionValue = String(row[0] ?? '');
    const nextSection = mapSectionToGroup(sectionValue, currentDiscipline);
    currentDiscipline = nextSection.nextDiscipline;
    if (nextSection.groupId) {
      currentGroupId = nextSection.groupId;
    }

    if (!isStaffRow(row[0])) {
      continue;
    }

    const importDate = detectedDate || new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
    const daysInMonth = endOfMonth(importDate).getDate();
    const pairRowIndex = rowIndex + 1;
    const nextRow = rows[pairRowIndex] || [];
    const mergedLeaveDays = new Set<number>();
    const vacations: Nurse['vacations'] = [];
    const leaveOverrides: Record<string, ShiftType> = {};

    const pairMerges = merges.filter(
      (merge) =>
        merge.s.r === rowIndex &&
        merge.e.r === pairRowIndex &&
        merge.s.c <= 31 &&
        merge.e.c >= 1
    );

    pairMerges.forEach((merge) => {
      const label = String(rows[merge.s.r]?.[merge.s.c] ?? '').trim();
      const normalizedLabel = normalizeText(label);
      const startDay = Math.max(1, merge.s.c);
      const endDay = Math.min(daysInMonth, merge.e.c);

      if (!normalizedLabel) {
        return;
      }

      if (normalizedLabel.includes('VACACIONES')) {
        vacations.push({
          start: format(new Date(importDate.getFullYear(), importDate.getMonth(), startDay), 'yyyy-MM-dd'),
          end: format(new Date(importDate.getFullYear(), importDate.getMonth(), endDay), 'yyyy-MM-dd'),
        });

        for (let day = startDay; day <= endDay; day += 1) {
          mergedLeaveDays.add(day);
        }
      } else if (normalizedLabel.includes('LICENCIA')) {
        for (let day = startDay; day <= endDay; day += 1) {
          const dateKey = format(new Date(importDate.getFullYear(), importDate.getMonth(), day), 'yyyy-MM-dd');
          mergedLeaveDays.add(day);
          leaveOverrides[dateKey] = 'LIC';
        }
      }
    });

    const groupId = inferGroupFromName(String(row[0]).trim(), currentGroupId);
    const teamId = groupId === 'SUPERVISORA' ? 1 : (groupCounters[groupId] % 5) + 1;
    groupCounters[groupId] += 1;

    const nurse: Nurse = {
      id: `${String(row[0]).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${rowIndex}`,
      name: String(row[0]).trim(),
      role: inferRole(groupId, String(row[0])),
      groupId,
      teamId,
      archived: false,
      vacations,
      hiringDate: '2020-01-01',
      overrides: { ...leaveOverrides },
    };

    for (let day = 1; day <= daysInMonth; day += 1) {
      if (mergedLeaveDays.has(day)) {
        continue;
      }

      const topValue = String(row[day] ?? '').trim();
      const bottomValue = String(nextRow[day] ?? '').trim();
      const parsedShift = combineShiftCodes(topValue, bottomValue) || 'L';
      nurse.overrides![format(new Date(importDate.getFullYear(), importDate.getMonth(), day), 'yyyy-MM-dd')] = parsedShift;
    }

    nurses.push(nurse);
    rowIndex += 1;
  }

  if (!nurses.length) {
    throw new Error('No staff rows could be detected in the Excel file.');
  }

  return {
    date: detectedDate || new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1),
    nurses,
    warnings,
  };
}
