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
  'GD': 12,
  'GN': 12,
  'M': 6,
  'T': 6,
  'MT': 12,
  'L': 0,
  'V': 0,
  'O': 0,
};

export const SHIFT_COLORS: Record<ShiftType, string> = {
  'GD': 'bg-blue-100 text-blue-700 border-blue-200',
  'GN': 'bg-indigo-900 text-indigo-100 border-indigo-800',
  'M': 'bg-teal-50 text-teal-700 border-teal-100',
  'T': 'bg-orange-50 text-orange-700 border-orange-100',
  'MT': 'bg-gradient-to-b from-teal-50 to-orange-50 text-slate-700 border-slate-200',
  'L': 'bg-gray-50 text-gray-400 border-gray-100',
  'V': 'bg-rose-100 text-rose-700 border-rose-200',
  'O': 'bg-amber-100 text-amber-700 border-amber-200',
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  'GD': 'Day Guard',
  'GN': 'Night Guard',
  'M': 'Morning',
  'T': 'Afternoon',
  'MT': 'Morning + Afternoon',
  'L': 'Off',
  'V': 'Vacation',
  'O': 'Birthday/Holiday',
};

export const ROTATION_PATTERN: ShiftType[] = ['GD', 'GN', 'L', 'L', 'L'];
