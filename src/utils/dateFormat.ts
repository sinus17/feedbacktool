/**
 * Formats a date string to DD/MM/YY format
 * @param dateString - ISO date string or date-like string
 * @returns Formatted date string in DD/MM/YY format
 */
export const formatDateToDDMMYY = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Formats a date string to DD/MM/YY HH:MM format
 * @param dateString - ISO date string or date-like string
 * @returns Formatted date string in DD/MM/YY HH:MM format
 */
export const formatDateTimeToDD_MM_YY_HH_MM = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};
