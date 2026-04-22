/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShiftType = 'GD' | 'GN' | 'M' | 'T' | 'L' | 'V' | 'O'; // Guardia Diurna, Guardia Nocturna, Mañana, Tarde, Libre, Vacation, Onomastico

export interface VacationRange {
  start: string; // ISO Date
  end: string;   // ISO Date
}

export type StaffGroupId = 
  | 'LIC_NOMBRADOS' 
  | 'LIC_CAS' 
  | 'TEC_NOMBRADOS' 
  | 'TEC_CAS' 
  | 'SUPERVISORA' 
  | 'DESTACADO' 
  | 'REEMPLAZO';

export interface Nurse {
  id: string;
  name: string;
  role: 'Licenciada' | 'Técnico' | 'Supervisora';
  groupId: StaffGroupId;
  teamId: number; // 0-4 for the 5-day cycle
  vacations: VacationRange[];
  hiringDate: string; // To calculate the start of their cycle
  overrides?: Record<string, ShiftType>; // Key is ISO date string 'YYYY-MM-DD'
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
