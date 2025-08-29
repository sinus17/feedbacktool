/**
 * Feedback message parsing and formatting utilities
 */

interface FeedbackSection {
  type: 'text' | 'paragraph' | 'list' | 'empty';
  content: string;
}

export function parseFeedbackContent(content: string): FeedbackSection[] {
  if (!content) return [];

  // Split content into sections while preserving empty lines
  const sections = content.split(/(\n\s*\n)/).map(section => section.trim());
  
  return sections.map(section => {
    // Handle empty lines
    if (!section) {
      return {
        type: 'empty',
        content: '\n'
      };
    }

    // Check if section is a list
    if (section.includes('\n') && section.match(/^[-*•]\s/m)) {
      return {
        type: 'list',
        content: section
      };
    }
    
    // Check if it's a single line
    if (!section.includes('\n')) {
      return {
        type: 'text',
        content: section
      };
    }

    // Otherwise treat as paragraph
    return {
      type: 'paragraph',
      content: section
    };
  });
}

export function extractFeedbackMessage(content: string): string | null {
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
          // Parse message into sections
          const sections = parseFeedbackContent(message);
          return sections
            .map(section => {
              switch (section.type) {
                case 'empty':
                  return '';
                case 'list':
                  return section.content
                    .split('\n')
                    .map(line => line.trim().replace(/^[-*•]\s*/, '• '))
                    .join('\n');
                case 'paragraph':
                case 'text':
                default:
                  return section.content;
              }
            })
            .join('\n\n');
        }
      }
    }

    // If no marker found but content exists, parse the whole content
    if (cleanContent) {
      const sections = parseFeedbackContent(cleanContent);
      return sections
        .map(section => section.type === 'empty' ? '' : section.content)
        .join('\n\n');
    }

    return null;
  } catch (error) {
    console.error('Error extracting feedback message:', error);
    return null;
  }
}

export function formatFeedbackMessage(message: string): string {
  if (!message) return '';

  const sections = parseFeedbackContent(message);
  
  return sections
    .map(section => {
      switch (section.type) {
        case 'empty':
          return '';
        case 'list':
          return section.content
            .split('\n')
            .map(line => `• ${line.trim().replace(/^[-*•]\s*/, '')}`)
            .join('\n');
        case 'paragraph':
          return section.content;
        case 'text':
        default:
          return section.content;
      }
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n'); // Normalize multiple empty lines to max 2
}