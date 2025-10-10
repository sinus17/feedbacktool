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
  userId?: string | null;
  videoUrl?: string;
  createdAt: string;
  readAt?: string | null;
  updatedAt?: string;
}

export interface Artist {
  id: string | number;
  name: string;
  whatsappGroupId?: string | null;
  submissions: number;
  lastSubmission?: string | null;
  archived?: boolean;
  avatarUrl?: string | null;
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

export type Team = 'admin' | 'management' | 'production' | 'marketing' | 'support';

export interface LibraryVideo {
  id: string;
  platform: 'tiktok' | 'instagram';
  sourceUrl: string;
  videoId: string;
  accountUsername?: string;
  accountName?: string;
  followerCount?: number;
  title?: string;
  description?: string;
  uploadDate?: string;
  duration?: number;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  collectCount?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  thumbnailStorageUrl?: string;
  creatorAvatarUrl?: string;
  creatorAvatarStorageUrl?: string;
  isPhotoPost?: boolean;
  imageUrls?: string[];
  textLanguage?: string;
  diversificationLabels?: string[];
  diversification_labels?: string[];
  suggestedWords?: string[];
  suggested_words?: string[];
  location_name?: string;
  hashtags?: string[];
  musicTitle?: string;
  musicAuthor?: string;
  musicAlbum?: string;
  musicCoverLarge?: string;
  musicCoverMedium?: string;
  musicCoverThumb?: string;
  musicIsCopyrighted?: boolean;
  musicVideoCount?: number;
  isOriginalSound?: boolean;
  spotifyId?: string;
  appleMusicId?: string;
  genre?: string | string[];
  category?: string | string[];
  type?: 'song-specific' | 'off-topic';
  actor?: 'solo' | 'multiple';
  tags?: string[];
  contentDescription?: string;
  whyItWorks?: string;
  artistRecommendation?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isPublished: boolean;
  featured: boolean;
}

export interface LibraryQueueItem {
  id: string;
  platform: 'tiktok' | 'instagram';
  sourceUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  processedAt?: string;
  videoLibraryId?: string;
}