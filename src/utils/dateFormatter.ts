import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

// Use Europe/Berlin timezone by default
const DEFAULT_TIMEZONE = 'Europe/Berlin';

export const formatDateTime = (isoString: string): string => {
  try {
    const date = parseISO(isoString);
    // Convert to Berlin time by adjusting for timezone offset
    const berlinOffset = getBerlinOffset(date);
    const berlinDate = new Date(date.getTime() + berlinOffset);
    return format(berlinDate, 'dd.MM.yyyy HH:mm', { locale: de });
  } catch (error) {
    console.error('Date formatting error:', error);
    return isoString; // Fallback to original string if parsing fails
  }
};

export const formatDate = (isoString: string): string => {
  try {
    const date = parseISO(isoString);
    const berlinOffset = getBerlinOffset(date);
    const berlinDate = new Date(date.getTime() + berlinOffset);
    return format(berlinDate, 'dd.MM.yyyy', { locale: de });
  } catch (error) {
    console.error('Date formatting error:', error);
    return isoString;
  }
};

export const formatTime = (isoString: string): string => {
  try {
    const date = parseISO(isoString);
    const berlinOffset = getBerlinOffset(date);
    const berlinDate = new Date(date.getTime() + berlinOffset);
    return format(berlinDate, 'HH:mm', { locale: de });
  } catch (error) {
    console.error('Date formatting error:', error);
    return isoString;
  }
};

export const getCurrentBerlinTime = (): Date => {
  const now = new Date();
  const berlinOffset = getBerlinOffset(now);
  return new Date(now.getTime() + berlinOffset);
};

export const convertToBerlinTime = (date: Date): Date => {
  const berlinOffset = getBerlinOffset(date);
  return new Date(date.getTime() + berlinOffset);
};

export const convertToUTC = (berlinDate: Date): Date => {
  const berlinOffset = getBerlinOffset(berlinDate);
  return new Date(berlinDate.getTime() - berlinOffset);
};

// Helper function to calculate Berlin timezone offset
function getBerlinOffset(date: Date): number {
  // Berlin is UTC+1 in winter (CET) and UTC+2 in summer (CEST)
  // This is a simplified approach - for production, consider using a proper timezone library
  const year = date.getFullYear();
  
  // DST starts last Sunday in March, ends last Sunday in October
  const dstStart = getLastSundayOfMonth(year, 2); // March (0-indexed)
  const dstEnd = getLastSundayOfMonth(year, 9);   // October (0-indexed)
  
  const isDST = date >= dstStart && date < dstEnd;
  
  // Return offset in milliseconds
  return isDST ? 2 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000; // UTC+2 or UTC+1
}

function getLastSundayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0); // Last day of the month
  const lastSunday = new Date(lastDay);
  lastSunday.setDate(lastDay.getDate() - lastDay.getDay());
  lastSunday.setHours(2, 0, 0, 0); // DST change happens at 2 AM
  return lastSunday;
}