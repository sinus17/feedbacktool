import { mapStatus } from '../statusMapper';
import type { VideoRow, FeedbackRow, ProcessedFeedback } from './types';

export function processVideoRow(row: VideoRow) {
  return {
    projectName: row.Name.trim(),
    videoUrl: row['Dropbox-Link'].trim(),
    type: row['Content Art']?.toLowerCase()?.includes('off') ? 'off-topic' : 'song-specific',
    status: mapStatus(row.Status)
  };
}

export function processFeedback(feedback: FeedbackRow[]): Map<string, ProcessedFeedback> {
  const latestFeedback = new Map<string, ProcessedFeedback>();

  if (!Array.isArray(feedback)) {
    console.error('Invalid feedback data:', feedback);
    return latestFeedback;
  }

  feedback
    .filter(row => {
      // Validate row data
      const isValid = row && 
        typeof row['Item Name'] === 'string' && 
        row['Item Name'].trim() &&
        row['Created At'] &&
        row['Update Content'];

      if (!isValid) {
        console.debug('Skipping invalid feedback row:', row);
      }

      return isValid;
    })
    .forEach(row => {
      try {
        const projectName = row['Item Name'].trim();
        const message = extractFeedbackMessage(row['Update Content']);

        if (!message) {
          console.debug('No valid feedback message found for:', projectName);
          return;
        }

        const formattedMessage = formatFeedbackMessage(message);
        
        // Only keep the latest feedback for each video
        const existing = latestFeedback.get(projectName);
        if (!existing || new Date(row['Created At']) > new Date(existing.createdAt)) {
          latestFeedback.set(projectName, {
            projectName,
            createdAt: row['Created At'],
            message: formattedMessage,
            status: row['Status']
          });
        }
      } catch (error) {
        console.error('Error processing feedback row:', { row, error });
      }
    });

  return latestFeedback;
}

function extractFeedbackMessage(content: string): string | null {
  if (!content || typeof content !== 'string') return null;

  try {
    // Clean up content but preserve line breaks
    const cleanContent = content
      .replace(/\u200B/g, '') // Remove zero-width spaces
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim();

    // Try to extract comment after marker
    const commentMarkers = [
      /\*\*Kommentar:\*\*([\s\S]*)/i,
      /Kommentar:([\s\S]*)/i,
      /Comment:([\s\S]*)/i,
      /Feedback:([\s\S]*)/i,
      /Message:([\s\S]*)/i
    ];

    // Try each marker pattern
    for (const marker of commentMarkers) {
      const match = cleanContent.match(marker);
      if (match && match[1]) {
        const message = match[1].trim();
        if (message) {
          return message;
        }
      }
    }

    // If no marker found but content exists, return the cleaned content
    return cleanContent.length > 0 ? cleanContent : null;
  } catch (error) {
    console.error('Error extracting feedback message:', error);
    return null;
  }
}

function formatFeedbackMessage(message: string): string {
  if (!message) return '';

  return message
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n\n');
}