import { format, addDays, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { Nurse, NurseRoster, RosterDay, ShiftType } from '../types';
import { ROTATION_PATTERN, SHIFT_HOURS } from '../constants';

export function isBirthdayForDate(nurse: Nurse, date: Date) {
  return Boolean(
    nurse.birthDate &&
    format(parseISO(nurse.birthDate), 'MM-dd') === format(date, 'MM-dd')
  );
}

export function getShiftForDate(nurse: Nurse, date: Date): ShiftType {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Check for manual overrides first
  if (nurse.overrides && dateStr in nurse.overrides) {
    return nurse.overrides[dateStr];
  }

  // When a month has been loaded from Supabase, the saved assignment for that
  // exact date should win over derived vacation/rotation logic.
  if (nurse.loadedMonthAssignments && dateStr in nurse.loadedMonthAssignments) {
    return nurse.loadedMonthAssignments[dateStr];
  }

  // Check if date is in vacation
  for (const range of nurse.vacations) {
    const start = parseISO(range.start);
    const end = parseISO(range.end);
    if (isWithinInterval(date, { start, end })) {
      return 'V';
    }
  }

  // Calculate day in rotation
  // We use the hiring date as a reference Point 0 for the cycle
  // Every nurse starts their Team rotation pattern offset by their teamId
  const referenceDate = parseISO('2026-01-01'); // Fixed global reference
  const daysDiff = differenceInDays(date, referenceDate);
  
  // Staggering logic: Team 0 starts pattern on day X, Team 1 starts on day X+1, etc.
  // We subtract the teamId to "delay" their start
  const patternIndex = (daysDiff - nurse.teamId) % ROTATION_PATTERN.length;
  
  // Handle negative index if date is before reference
  const normalizedIndex = patternIndex < 0 ? patternIndex + ROTATION_PATTERN.length : patternIndex;
  
  return ROTATION_PATTERN[normalizedIndex];
}

export function generateMonthlyRoster(nurses: Nurse[], year: number, month: number): NurseRoster[] {
  const startDate = startOfMonth(new Date(year, month));
  const endDate = endOfMonth(startDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return nurses.map(nurse => {
    const nurseDays: RosterDay[] = days.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      shift: getShiftForDate(nurse, date)
    }));

    const totalHours = nurseDays.reduce((acc, day) => acc + SHIFT_HOURS[day.shift], 0);

    return {
      nurse,
      days: nurseDays,
      totalHours
    };
  });
}
