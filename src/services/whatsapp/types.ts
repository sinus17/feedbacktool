import type { Artist, VideoSubmission } from '../../types';

export interface WhatsAppMessage {
  groupId: string;
  text: string;
  previewUrl?: boolean;
}

export interface WhatsAppResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface NotificationContext {
  artist: Artist;
  submission: VideoSubmission;
  feedback?: string;
  status?: string;
}

export interface WhatsAppService {
  sendMessage: (params: { groupId: string; text: string }) => Promise<void>;
  notifyTeam: (context: NotificationContext) => Promise<void>;
  notifyArtist: (context: NotificationContext) => Promise<void>;
  notifyAdCreativeUpdate: (params: {
    artistName: string;
    artistId: string;
    artistGroupId?: string | null;
    platform: string;
    content: string;
    status: string;
    rejectionReason?: string;
   isReplacement?: boolean;
   previousContent?: string;
    videoName?: string;
  }) => Promise<void>;
}