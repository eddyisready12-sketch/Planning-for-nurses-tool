/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShiftType = 'D' | 'N' | 'M' | 'T' | 'MT' | 'L' | 'VAC' | 'LIC' | 'O';

export interface VacationRange {
  start: string;
  end: string;
}

export type StaffGroupId =
  | 'LIC_NOMBRADOS'
  | 'LIC_CAS'
  | 'TEC_NOMBRADOS'
  | 'TEC_CAS'
  | 'SUPERVISORA'
  | 'DESTACADO'
  | 'REEMPLAZO';

export type StaffRole = 'Licenciada' | 'TÃ©cnico' | 'Técnico' | 'Supervisora';

export interface Nurse {
  id: string;
  name: string;
  role: StaffRole;
  groupId: StaffGroupId;
  teamId: number;
  archived?: boolean;
  birthDate?: string;
  vacations: VacationRange[];
  hiringDate: string;
  overrides?: Record<string, ShiftType>;
  loadedMonthAssignments?: Record<string, ShiftType>;
}

export interface RosterDay {
  date: string;
  shift: ShiftType;
}

export interface NurseRoster {
  nurse: Nurse;
  days: RosterDay[];
  totalHours: number;
}
