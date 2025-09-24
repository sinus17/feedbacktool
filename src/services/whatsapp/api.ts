import { WHATSAPP_CONFIG } from '../../config/whatsapp';
import type { WhatsAppMessage, WhatsAppResponse, WhatsAppGroup } from './types';

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

  static async searchGroups(searchTerm: string): Promise<WhatsAppGroup[]> {
    // Validate required parameters
    if (!searchTerm?.trim()) {
      throw new Error('WhatsApp API Error: search term is required');
    }
    if (!WHATSAPP_CONFIG.TOKEN) {
      throw new Error('WhatsApp API Error: API token is not configured');
    }

    try {
      const response = await fetch(`https://gate.whapi.cloud/groups`, {
        method: 'GET',
        headers: this.headers
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
      const groups = data.groups || [];
      
      // Filter groups by search term (case insensitive)
      const filteredGroups = groups.filter((group: any) => 
        group.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return filteredGroups.map((group: any) => ({
        id: group.id,
        name: group.name,
        participants: group.participants_count,
        description: group.description
      }));
    } catch (error) {
      // Add context to error
      const enhancedError = new Error(
        error instanceof Error ? error.message : 'Unknown WhatsApp API error'
      );
      
      // Add metadata
      Object.assign(enhancedError, {
        context: {
          searchTerm,
          hasToken: !!WHATSAPP_CONFIG.TOKEN,
          originalError: error
        }
      });

      throw enhancedError;
    }
  }

  static async searchArtistGroup(artistName: string): Promise<WhatsAppGroup | null> {
    const searchTerm = `${artistName} x SwipeUp`;
    
    try {
      const groups = await this.searchGroups(searchTerm);
      
      // Find the most relevant group (exact match preferred)
      const exactMatch = groups.find(group => 
        group.name.toLowerCase() === searchTerm.toLowerCase()
      );
      
      if (exactMatch) {
        return exactMatch;
      }
      
      // If no exact match, return the first group that contains the search term
      return groups.length > 0 ? groups[0] : null;
    } catch (error) {
      console.error('Failed to search for artist group:', error);
      throw error;
    }
  }
}