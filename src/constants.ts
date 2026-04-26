/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShiftType, StaffGroupId } from './types';

export const STAFF_GROUP_LABELS: Record<StaffGroupId, string> = {
  'LIC_NOMBRADOS': 'LICENCIADAS EN ENFERMERÃA - NOMBRADOS',
  'LIC_CAS': 'ENFERMERAS CAS UCI GENERAL',
  'TEC_NOMBRADOS': 'TECNICOS EN ENFERMERÃA - NOMBRADOS',
  'TEC_CAS': 'TECNICOS CAS UCI GENERAL',
  'SUPERVISORA': 'SUPERVISORA',
  'DESTACADO': 'DESTACADO',
  'REEMPLAZO': 'REEMPLAZO',
};

export const SHIFT_HOURS: Record<ShiftType, number> = {
  'D': 12,
  'N': 12,
  'M': 6,
  'T': 6,
  'MT': 12,
  'L': 0,
  'VAC': 0,
  'LIC': 0,
  'O': 0,
};

export const SHIFT_COLORS: Record<ShiftType, string> = {
  'D': 'bg-blue-100 text-blue-700 border-blue-200',
  'N': 'bg-indigo-900 text-indigo-100 border-indigo-800',
  'M': 'bg-teal-50 text-teal-700 border-teal-100',
  'T': 'bg-orange-50 text-orange-700 border-orange-100',
  'MT': 'bg-gradient-to-b from-teal-50 to-orange-50 text-slate-700 border-slate-200',
  'L': 'bg-gray-50 text-gray-400 border-gray-100',
  'VAC': 'bg-rose-100 text-rose-700 border-rose-200',
  'LIC': 'bg-violet-100 text-violet-700 border-violet-200',
  'O': 'bg-amber-100 text-amber-700 border-amber-200',
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  'D': 'Day Guard',
  'N': 'Night Guard',
  'M': 'Morning',
  'T': 'Afternoon',
  'MT': 'Morning + Afternoon',
  'L': 'Off',
  'VAC': 'Vacation',
  'LIC': 'License',
  'O': 'Birthday/Holiday',
};

export const ROTATION_PATTERN: ShiftType[] = ['D', 'N', 'L', 'L', 'L'];
