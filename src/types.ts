export interface VideoSubmission {
  id: string | number;
  projectName: string;
  videoUrl: string;
  artistId: string | number;
  type: 'song-specific' | 'off-topic';
  status: 'new' | 'feedback-needed' | 'correction-needed' | 'ready' | 'planned' | 'posted' | 'archived';
  messages: Message[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string | number;
  text: string;
  isAdmin: boolean;
  videoUrl?: string;
  createdAt: string;
  readAt?: string | null;
}

export interface Artist {
  id: string | number;
  name: string;
  whatsappGroupId?: string | null;
  submissions: number;
  lastSubmission?: string | null;
  archived?: boolean;
}

export interface AdCreative {
  id: string;
  createdAt: string;
  artists_id: string;
  platform: string;
  content: string;
  status: 'pending' | 'active' | 'archived' | 'rejected';
  rejectionReason?: string | null;
  updatedAt: string;
  videoName?: string | null;
  mergedInstagramReelUrl?: string | null;
  mergedTiktokAuthCode?: string | null;
  submissionId?: string | null;
  thumbnail_url?: string | null;
  instagram_thumbnail_url?: string | null;
  tiktok_thumbnail_url?: string | null;
}

export interface ContentPlanPost {
  id: string;
  createdAt: string;
  submissionId: string;
  artistId: string;
  scheduledDate: string;
  status: 'scheduled' | 'posted' | 'archived';
  updatedAt: string;
  notes?: string | null;
}
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  team: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Team = 'management' | 'production' | 'marketing' | 'support';