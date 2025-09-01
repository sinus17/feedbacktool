import { parseISO } from 'date-fns';

export const formatDateTime = (isoString: string): string => {
  try {
    const date = parseISO(isoString);
    // Use toLocaleString with Europe/Berlin timezone for accurate conversion
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    console.error('Date formatting error:', error);
    return isoString; // Fallback to original string if parsing fails
  }
};

export const formatDate = (isoString: string): string => {
  try {
    const date = parseISO(isoString);
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Date formatting error:', error);
    return isoString;
  }
};

export const formatTime = (isoString: string): string => {
  try {
    const date = parseISO(isoString);
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (error) {
    console.error('Date formatting error:', error);
    return isoString;
  }
};

export const getCurrentBerlinTime = (): Date => {
  return new Date();
};