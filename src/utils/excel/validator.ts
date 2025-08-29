import type { VideoRow } from './types';

export function validateVideoRow(row: VideoRow): string | null {
  if (!row.Name?.trim()) {
    return 'Missing video name';
  }
  if (!row['Dropbox-Link']?.trim()) {
    return 'Missing Dropbox link';
  }
  if (!row['Link to 👥 Kunden']?.trim()) {
    return 'Missing artist name';
  }
  if (!row['Dropbox-Link'].toLowerCase().includes('dropbox.com')) {
    return 'Invalid Dropbox link format';
  }
  return null;
}