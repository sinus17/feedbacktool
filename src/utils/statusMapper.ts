export type VideoStatus = 'new' | 'feedback-needed' | 'correction-needed' | 'ready' | 'posted';

export const mapStatus = (status: string): VideoStatus => {
  if (!status) return 'new';
  
  const statusLower = status.toLowerCase().trim();
  
  // Direct status mappings
  const statusMap: Record<string, VideoStatus> = {
    'new': 'new',
    'neu': 'new',
    'ready': 'ready',
    'fertig': 'ready',
    'feedback needed': 'feedback-needed',
    'feedback benötigt': 'feedback-needed',
    'correction needed': 'correction-needed',
    'korrektur nötig': 'correction-needed',
    'posted': 'posted',
    'gepostet': 'posted'
  };

  // Check for exact matches first
  const exactMatch = statusMap[statusLower];
  if (exactMatch) {
    return exactMatch;
  }

  // Then check for partial matches
  if (/\b(posted|gepostet)\b/i.test(statusLower)) {
    return 'posted';
  }
  if (/\b(ready|fertig|done|complete|finished)\b/i.test(statusLower)) {
    return 'ready';
  }
  if (/\b(korrektur|correction)\b/i.test(statusLower)) {
    return 'correction-needed';
  }
  if (/\b(feedback)\b/i.test(statusLower)) {
    return 'feedback-needed';
  }

  // If status contains "Ready", it should be ready regardless of other words
  if (statusLower.includes('ready')) {
    return 'ready';
  }

  // Default status
  return 'new';
};