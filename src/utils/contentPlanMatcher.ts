/**
 * Utility functions for matching ad creatives with content plan posts
 */

/**
 * Normalizes a string for comparison by:
 * - Converting to lowercase
 * - Trimming whitespace
 * - Removing special characters
 * - Normalizing spaces
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')  // Remove special characters
    .replace(/\s+/g, ' ');    // Normalize spaces
}

/**
 * Checks if two strings match after normalization
 */
export function stringsMatch(str1: string | null | undefined, str2: string | null | undefined): boolean {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  if (!normalized1 || !normalized2) return false;
  
  return normalized1 === normalized2;
}

/**
 * Checks if a string contains another string after normalization
 */
export function stringContains(str: string | null | undefined, substring: string | null | undefined): boolean {
  const normalizedStr = normalizeString(str);
  const normalizedSubstring = normalizeString(substring);
  
  if (!normalizedStr || !normalizedSubstring) return false;
  
  return normalizedStr.includes(normalizedSubstring);
}

/**
 * Calculates similarity between two strings (0-1)
 * Higher value means more similar
 */
export function stringSimilarity(str1: string | null | undefined, str2: string | null | undefined): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  
  // Simple similarity based on common characters
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}