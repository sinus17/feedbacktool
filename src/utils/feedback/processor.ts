/**
 * Feedback message processing and validation
 */

import { formatFeedbackMessage, extractFeedbackMessage } from './parser';

export interface ProcessedFeedback {
  projectName: string;
  createdAt: string;
  message: string;
  status?: string;
}

export interface FeedbackRow {
  'Item Name': string;
  'Created At': string;
  'Update Content': string;
  'Status'?: string;
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

export function validateFeedbackMessage(message: string): boolean {
  if (!message || typeof message !== 'string') return false;

  // Message should not be too short
  if (message.trim().length < 3) return false;

  // Message should contain actual content
  if (!/[a-zA-Z0-9]/.test(message)) return false;

  return true;
}

export function getFeedbackType(message: string): 'correction' | 'feedback' | 'ready' {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('fertig') || 
      lowerMessage.includes('ready') || 
      lowerMessage.includes('complete')) {
    return 'ready';
  }
  
  if (lowerMessage.includes('korrektur') || 
      lowerMessage.includes('correction') || 
      lowerMessage.includes('fix')) {
    return 'correction';
  }
  
  return 'feedback';
}