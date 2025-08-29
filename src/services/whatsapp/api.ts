import { WHATSAPP_CONFIG } from '../../config/whatsapp';
import type { WhatsAppMessage, WhatsAppResponse } from './types';

export class WhatsAppAPI {
  private static headers = {
    'Authorization': `Bearer ${WHATSAPP_CONFIG.TOKEN}`,
    'Content-Type': 'application/json'
  };

  static async sendMessage({ groupId, text, previewUrl = true }: WhatsAppMessage): Promise<WhatsAppResponse> {
    // Validate required parameters
    if (!groupId?.trim()) {
      throw new Error('WhatsApp API Error: groupId is required');
    }
    if (!text?.trim()) {
      throw new Error('WhatsApp API Error: text message is required');
    }
    if (!WHATSAPP_CONFIG.TOKEN) {
      throw new Error('WhatsApp API Error: API token is not configured');
    }

    // Validate message length (WhatsApp limit is 4096 characters)
    if (text.length > 4096) {
      throw new Error('WhatsApp API Error: Message exceeds maximum length of 4096 characters');
    }

    try {
      // Clean up group ID format
      const cleanGroupId = groupId.replace('@g.us', '').trim();
      
      const response = await fetch(`${WHATSAPP_CONFIG.API_URL}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          to: `${cleanGroupId}@g.us`,
          body: text,
          preview_url: previewUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          errorData.message || 
          `WhatsApp API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Add context to error
      const enhancedError = new Error(
        error instanceof Error ? error.message : 'Unknown WhatsApp API error'
      );
      
      // Add metadata
      Object.assign(enhancedError, {
        context: {
          groupId,
          textLength: text.length,
          hasToken: !!WHATSAPP_CONFIG.TOKEN,
          originalError: error
        }
      });

      throw enhancedError;
    }
  }
}