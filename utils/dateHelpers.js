import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  isToday,
  isThisWeek,
  isThisMonth,
  parseISO,
} from 'date-fns';

export function formatDate(date, fmt = 'MMM dd, yyyy') {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

export function formatDateTime(date) {
  return formatDate(date, 'MMM dd, yyyy hh:mm a');
}

export function formatDateForInput(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function getDateRange(period) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'last_7_days':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case 'last_30_days':
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

export {
  isToday,
  isThisWeek,
  isThisMonth,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  format,
};
