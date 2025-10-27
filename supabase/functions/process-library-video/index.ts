// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const RAPIDAPI_KEY = '14f8e13cf8msh72d1c5e7c21cce5p1fde48jsne68dcd853309';
const TIKTOK_API_HOST = 'tiktok-api23.p.rapidapi.com';
const INSTAGRAM_API_HOST = 'instagram-media-api.p.rapidapi.com';

interface VideoData {
  platform: 'tiktok' | 'instagram';
  sourceUrl: string;
  videoId: string;
  accountUsername?: string;
  accountName?: string;
  title?: string;
  description?: string;
  uploadDate?: string;
  duration?: number;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
}

async function getTikTokVideoDetails(videoUrl: string, videoId: string): Promise<any> {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY environment variable is not set');
  }

  // Use post/detail endpoint to get full metadata
  const url = `https://tiktok-api23.p.rapidapi.com/api/post/detail?videoId=${videoId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
    },
  });

  console.log('Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
    throw new Error(`Failed to fetch TikTok video details: ${response.statusText} - ${errorText}`);
  }

  const responseText = await response.text();
  console.log('Raw API Response length:', responseText.length);
  
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 200)}`);
  }
  
  console.log('Parsed API Response keys:', Object.keys(result));
  
  // Check if response has error
  if (result.statusCode && result.statusCode !== 0) {
    throw new Error(`TikTok API error: ${result.statusMsg || 'API returned error status'}`);
  }
  
  // The API returns data under itemInfo.itemStruct
  if (!result.itemInfo || !result.itemInfo.itemStruct) {
    console.error('No itemInfo in response. Full response keys:', Object.keys(result));
    throw new Error(`TikTok API error: ${result.statusMsg || result.message || 'No data returned'}`);
  }

  // Return the itemStruct as data for compatibility
  return { data: result.itemInfo.itemStruct, shareMeta: result.shareMeta };
}

async function downloadTikTokVideo(videoUrl: string, videoId: string): Promise<any> {
  return await getTikTokVideoDetails(videoUrl, videoId);
}

async function resolveTikTokShortUrl(shortUrl: string): Promise<string> {
  try {
    // Follow redirects to get the full URL
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });
    return response.url;
  } catch (error) {
    console.error('Error resolving short URL:', error);
    return shortUrl;
  }
}

async function extractTikTokVideoId(url: string): Promise<string | null> {
  let processUrl = url;
  
  // If it's a short URL, resolve it first
  if (url.includes('vm.tiktok.com')) {
    console.log('Resolving short URL:', url);
    processUrl = await resolveTikTokShortUrl(url);
    console.log('Resolved to:', processUrl);
  }
  
  // Handle different TikTok URL formats (including photo posts)
  const patterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /tiktok\.com\/@[\w.-]+\/photo\/(\d+)/,  // Photo post format
    /tiktok\.com\/v\/(\d+)/,
    /\/video\/(\d+)/,
    /\/photo\/(\d+)/,  // Photo post format
  ];

  for (const pattern of patterns) {
    const match = processUrl.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function extractInstagramShortcode(url: string): Promise<string | null> {
  // Handle different Instagram URL formats
  // https://www.instagram.com/reel/DFvbbXQy0cJ/
  // https://www.instagram.com/p/DFvbbXQy0cJ/
  const patterns = [
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function getInstagramReelDetails(shortcode: string): Promise<any> {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY environment variable is not set');
  }

  const url = 'https://instagram-media-api.p.rapidapi.com/media/shortcode_reels';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'instagram-media-api.p.rapidapi.com',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shortcode: shortcode,
      proxy: ''
    })
  });

  console.log('Instagram API Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Instagram API Error Response:', errorText);
    throw new Error(`Failed to fetch Instagram reel details: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Instagram API Response keys:', Object.keys(result));
  
  if (result.error) {
    console.error('Instagram API Error Details:', JSON.stringify(result, null, 2));
    const errorMessage = result.message || result.error || 'Unknown Instagram API error';
    throw new Error(`Instagram API error: ${errorMessage} (Status: ${result.status || 'unknown'})`);
  }
  
  // New API structure: data.xdt_api__v1__media__shortcode__web_info.items[0]
  if (!result.data || !result.data.xdt_api__v1__media__shortcode__web_info || !result.data.xdt_api__v1__media__shortcode__web_info.items || result.data.xdt_api__v1__media__shortcode__web_info.items.length === 0) {
    console.error('Instagram API Response:', JSON.stringify(result, null, 2));
    throw new Error('No data returned from Instagram API');
  }

  return result;
}

async function getInstagramPostDetails(shortcode: string): Promise<any> {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY environment variable is not set');
  }

  const url = 'https://instagram-media-api.p.rapidapi.com/media/shortcode';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'instagram-media-api.p.rapidapi.com',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shortcode: shortcode,
      proxy: ''
    })
  });

  console.log('Instagram Post API Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Instagram Post API Error Response:', errorText);
    throw new Error(`Failed to fetch Instagram post details: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Instagram Post API Response keys:', Object.keys(result));
  
  if (result.error) {
    console.error('Instagram Post API Error Details:', JSON.stringify(result, null, 2));
    const errorMessage = result.message || result.error || 'Unknown Instagram API error';
    throw new Error(`Instagram API error: ${errorMessage} (Status: ${result.status || 'unknown'})`);
  }
  
  // Feed post structure: data.xdt_shortcode_media
  if (!result.data || !result.data.xdt_shortcode_media) {
    console.error('Instagram Post API Response:', JSON.stringify(result, null, 2));
    throw new Error('No data returned from Instagram Post API');
  }

  return result;
}

async function uploadVideoToStorage(
  supabase: any,
  videoUrl: string,
  videoId: string,
  platform: string
): Promise<string> {
  // Download video
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error('Failed to download video from source');
  }

  const videoBlob = await videoResponse.blob();
  const fileName = `${platform}-${videoId}-${Date.now()}.mp4`;

  // Upload to Supabase storage
  const { data, error } = await supabase.storage
    .from('library-videos')
    .upload(fileName, videoBlob, {
      contentType: 'video/mp4',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload video to storage: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('library-videos')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function uploadImageToStorage(
  supabase: any,
  imageUrl: string,
  videoId: string,
  platform: string,
  type: 'thumbnail' | 'avatar'
): Promise<string | null> {
  try {
    // Download image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.warn(`Failed to download ${type} from ${imageUrl}`);
      return null;
    }

    const imageBlob = await imageResponse.blob();
    const extension = imageBlob.type.split('/')[1] || 'jpg';
    const fileName = `${platform}-${videoId}-${type}-${Date.now()}.${extension}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('library-videos')
      .upload(fileName, imageBlob, {
        contentType: imageBlob.type,
        upsert: false,
      });

    if (error) {
      console.warn(`Failed to upload ${type} to storage:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('library-videos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.warn(`Error uploading ${type}:`, error);
    return null;
  }
}

async function processTikTokVideo(
  supabase: any,
  queueId: string,
  sourceUrl: string,
  createdBy?: string,
  genre?: string[] | null,
  category?: string[] | null,
  type?: string,
  actor?: string
): Promise<void> {
  try {
    // Extract video ID
    const videoId = await extractTikTokVideoId(sourceUrl);
    if (!videoId) {
      throw new Error('Invalid TikTok URL format');
    }

    // Update queue status to processing
    await supabase
      .from('video_library_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', queueId);

    // Get video details
    console.log('Fetching TikTok video details...');
    const apiResponse = await getTikTokVideoDetails(sourceUrl, videoId);
    console.log('Details fetched successfully');

    // Extract data from RapidAPI response
    const data = apiResponse.data;
    const author = data.author || {};
    const stats = data.stats || {};
    const music = data.music || {};
    const authorStats = data.authorStats || data.authorStatsV2 || {};
    
    // Fetch additional music info if music ID is available
    let musicVideoCount = 0;
    if (music.id) {
      try {
        const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
        if (rapidApiKey) {
          console.log('Fetching music info for music ID:', music.id);
          const musicInfoResponse = await fetch(
            `https://tiktok-api23.p.rapidapi.com/api/music/info?musicId=${music.id}`,
            {
              headers: {
                'x-rapidapi-key': rapidApiKey,
                'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
              }
            }
          );
          const musicInfoData = await musicInfoResponse.json();
          if (musicInfoData?.data?.musicInfo?.stats?.videoCount) {
            musicVideoCount = musicInfoData.data.musicInfo.stats.videoCount;
            console.log('Music video count:', musicVideoCount);
          }
        }
      } catch (error) {
        console.error('Error fetching music info:', error);
        // Continue without music stats
      }
    }
    
    // Extract hashtags from API and description
    let hashtags = (data.hashtags || []).map((tag: any) => tag.name || tag);
    
    // Also extract hashtags from description as fallback/additional
    if (data.desc || data.title) {
      const hashtagRegex = /#[\w]+/g;
      const descHashtags = (data.desc || data.title || '').match(hashtagRegex) || [];
      const cleanDescHashtags = descHashtags.map((tag: string) => tag.replace('#', ''));
      
      // Merge and deduplicate
      hashtags = [...new Set([...hashtags, ...cleanDescHashtags])];
    }

    // Check if this is a photo post (image slideshow)
    const isPhotoPost = !!data.imagePost;
    console.log('Is photo post:', isPhotoPost);
    
    // Extract data from API response
    const videoData: VideoData = {
      platform: 'tiktok',
      sourceUrl,
      videoId,
      accountUsername: author.uniqueId || author.unique_id || '',
      accountName: author.nickname || '',
      title: data.desc || data.title || '',
      description: data.desc || data.title || '',
      uploadDate: data.createTime ? new Date(data.createTime * 1000).toISOString() : null,
      duration: data.video?.duration || data.duration || 0,
      viewsCount: stats.playCount || stats.play_count || 0,
      likesCount: stats.diggCount || stats.digg_count || 0,
      commentsCount: stats.commentCount || stats.comment_count || 0,
      sharesCount: stats.shareCount || stats.share_count || 0,
      thumbnailUrl: isPhotoPost ? data.imagePost?.images?.[0]?.imageURL?.urlList?.[0] : (data.video?.cover || data.cover || ''),
    };

    let videoStorageUrl = null;
    let imageUrls: string[] = [];

    if (isPhotoPost) {
      // Handle photo slideshow
      console.log('Processing photo slideshow...');
      const images = data.imagePost?.images || [];
      console.log(`Found ${images.length} images in slideshow`);
      
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i]?.imageURL?.urlList?.[0];
        if (imageUrl) {
          console.log(`Uploading image ${i + 1}/${images.length}...`);
          const imageStorageUrl = await uploadImageToStorage(
            supabase,
            imageUrl,
            videoId,
            'tiktok',
            `slide-${i}`
          );
          if (imageStorageUrl) {
            imageUrls.push(imageStorageUrl);
          }
        }
      }
      console.log(`Uploaded ${imageUrls.length} images`);
    } else {
      // Handle video post
      const videoDownloadUrl = 
        data.video?.downloadAddr ||  // HD version
        data.video?.playAddr ||      // Standard version
        data.play ||                 // Fallback
        data.hdplay;                 // Fallback HD

      if (!videoDownloadUrl) {
        console.error('No video URL found in API response');
        throw new Error('No video download URL found in API response');
      }

      console.log('Video download URL from RapidAPI:', videoDownloadUrl);

      // Get download URL from tikwm.com (more reliable for downloads)
      console.log('Fetching download URL from tikwm.com...');
      const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(sourceUrl)}&hd=1`;
      const tikwmResponse = await fetch(tikwmUrl);
      const tikwmData = await tikwmResponse.json();
      
      const tikwmVideoUrl = tikwmData.data?.hdplay || tikwmData.data?.play || tikwmData.data?.wmplay || videoDownloadUrl;
      console.log('Using tikwm.com video URL for download');

      // Upload video to Supabase storage
      console.log('Uploading video to storage...');
      videoStorageUrl = await uploadVideoToStorage(
        supabase,
        tikwmVideoUrl,
        videoId,
        'tiktok'
      );
    }

    videoData.videoUrl = videoStorageUrl;

    // Upload thumbnail and avatar images
    console.log('Uploading thumbnail and avatar images...');
    const thumbnailStorageUrl = await uploadImageToStorage(
      supabase,
      isPhotoPost ? (data.imagePost?.images?.[0]?.imageURL?.urlList?.[0] || '') : (data.video?.cover || data.cover || ''),
      videoId,
      'tiktok',
      'thumbnail'
    );

    const avatarStorageUrl = await uploadImageToStorage(
      supabase,
      author.avatarThumb || author.avatar || '',
      videoId,
      'tiktok',
      'avatar'
    );

    // Insert into video_library with extended data
    const { data: libraryVideo, error: insertError} = await supabase
      .from('video_library')
      .insert({
        // Basic info
        platform: videoData.platform,
        source_url: videoData.sourceUrl,
        video_id: videoData.videoId,
        account_username: videoData.accountUsername,
        account_name: videoData.accountName,
        title: videoData.title,
        description: videoData.description,
        upload_date: videoData.uploadDate,
        duration: videoData.duration,
        
        // Stats
        views_count: videoData.viewsCount,
        likes_count: videoData.likesCount,
        comments_count: videoData.commentsCount,
        shares_count: videoData.sharesCount,
        collect_count: stats.collectCount || stats.collect_count || 0,
        repost_count: stats.repostCount || stats.download_count || 0,
        
        // Media URLs
        video_url: videoData.videoUrl,
        thumbnail_url: videoData.thumbnailUrl,
        thumbnail_storage_url: thumbnailStorageUrl,
        cover_image_url: data.origin_cover || '',
        dynamic_cover_url: data.dynamic_cover || '',
        
        // Photo slideshow data
        is_photo_post: isPhotoPost,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        
        // Creator stats
        follower_count: authorStats.followerCount || 0,
        creator_heart_count: author.heartCount || author.heart || 0,
        creator_video_count: author.videoCount || author.video || 0,
        creator_avatar_url: author.avatarThumb || author.avatar || '',
        creator_avatar_storage_url: avatarStorageUrl,
        
        // Music info
        music_title: music.title || data.music || '',
        music_author: music.authorName || music.author || '',
        is_original_sound: music.original || false,
        music_url: music.playUrl || music.play || '',
        music_album: music.album || '',
        music_cover_large: music.coverLarge || music.cover || '',
        music_cover_medium: music.coverMedium || music.cover || '',
        music_cover_thumb: music.coverThumb || music.cover || '',
        music_video_count: musicVideoCount,
        music_is_copyrighted: false,
        spotify_id: null,
        apple_music_id: null,
        
        // Location
        location_name: data.locationCreated || data.region || '',
        location_city: '',
        location_country: data.locationCreated || data.region || '',
        location_address: '',
        
        // Video technical details
        video_quality: data.ratio || '',
        video_bitrate: data.bit_rate || 0,
        video_width: data.size || 0,
        video_height: data.size || 0,
        video_codec: '',
        
        // Complex data
        raw_api_data: apiResponse,
        challenges: data.challenges || [],
        text_extra: data.textExtra || [],
        subtitles: data.subtitleInfos || [],
        anchors: data.anchors || [],
        
        // Flags
        is_ad: false,
        duet_enabled: data.duet_enabled || false,
        stitch_enabled: data.stitch_enabled || false,
        share_enabled: true,
        
        // Additional metadata
        text_language: data.textExtra?.[0]?.lang || null,
        diversification_labels: data.diversificationLabels || [],
        suggested_words: data.suggestedWords || [],
        hashtags: hashtags,
        
        // Categorization
        genre: genre,
        category: category,
        type: type,
        actor: actor,
        
        processing_status: 'completed',
        is_published: true,
        created_by: createdBy,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert video: ${insertError.message}`);
    }

    // Update queue status to completed
    await supabase
      .from('video_library_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        video_library_id: libraryVideo.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    console.log('Video processed successfully:', libraryVideo.id);

    // Automatically trigger Gemini AI analysis
    try {
      console.log('Triggering Gemini AI analysis for video:', libraryVideo.id);
      const analysisResponse = await supabase.functions.invoke('analyze-video-gemini', {
        body: { videoId: libraryVideo.id }
      });
      
      if (analysisResponse.error) {
        console.error('Failed to trigger Gemini analysis:', analysisResponse.error);
      } else {
        console.log('Gemini analysis triggered successfully');
      }
    } catch (analysisError) {
      console.error('Error triggering Gemini analysis:', analysisError);
      // Don't fail the whole process if analysis fails
    }
  } catch (error) {
    console.error('Error processing video:', error);

    // Update queue with error
    await supabase
      .from('video_library_queue')
      .update({
        status: 'failed',
        error_message: error.message,
        retry_count: supabase.from('video_library_queue').select('retry_count').eq('id', queueId).single().then((r: any) => (r.data?.retry_count || 0) + 1),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    throw error;
  }
}

async function processInstagramReel(
  supabase: any,
  queueId: string,
  sourceUrl: string,
  createdBy?: string,
  genre?: string[] | null,
  category?: string[] | null,
  type?: string,
  actor?: string
): Promise<void> {
  try {
    // Extract shortcode
    const shortcode = await extractInstagramShortcode(sourceUrl);
    if (!shortcode) {
      throw new Error('Invalid Instagram URL format');
    }

    // Update queue status to processing
    await supabase
      .from('video_library_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', queueId);

    // Determine if it's a reel or feed post based on URL
    const isReel = sourceUrl.includes('/reel/');
    const isFeedPost = sourceUrl.includes('/p/');
    
    let apiResponse;
    let media;
    let isPhotoPost = false;
    let imageUrls: string[] = [];
    
    if (isReel) {
      // Get reel details
      console.log('Fetching Instagram reel details...');
      apiResponse = await getInstagramReelDetails(shortcode);
      console.log('Reel details fetched successfully');
      
      // Extract data from reel API response structure
      const items = apiResponse.data.xdt_api__v1__media__shortcode__web_info.items;
      media = items[0];
    } else if (isFeedPost) {
      // Get feed post details
      console.log('Fetching Instagram feed post details...');
      apiResponse = await getInstagramPostDetails(shortcode);
      console.log('Feed post details fetched successfully');
      
      // Extract data from feed post API response structure
      media = apiResponse.data.xdt_shortcode_media;
      
      // Check if it's a photo post or carousel
      isPhotoPost = !media.is_video;
      
      if (isPhotoPost) {
        console.log('Detected photo post/carousel');
        
        // Check if it's a carousel (sidecar)
        if (media.__typename === 'XDTGraphSidecar' && media.edge_sidecar_to_children) {
          console.log('Processing carousel with', media.edge_sidecar_to_children.edges.length, 'images');
          // Extract all image URLs from carousel
          imageUrls = media.edge_sidecar_to_children.edges.map((edge: any) => edge.node.display_url);
        } else {
          // Single image post
          console.log('Processing single image post');
          imageUrls = [media.display_url];
        }
      }
    } else {
      throw new Error('Unsupported Instagram URL type');
    }

    // Extract owner info (different structure for reels vs posts)
    const owner = media.user || media.owner || {};
    
    // Extract caption text (different structure for reels vs posts)
    let caption = '';
    if (isReel) {
      caption = media.caption?.text || '';
    } else if (isFeedPost) {
      // Feed posts have caption in edge_media_to_caption
      const captionEdges = media.edge_media_to_caption?.edges || [];
      caption = captionEdges.length > 0 ? captionEdges[0].node.text : '';
    }
    
    // Extract hashtags from caption
    let hashtags: string[] = [];
    if (caption) {
      const hashtagRegex = /#[\w]+/g;
      const captionHashtags = caption.match(hashtagRegex) || [];
      hashtags = captionHashtags.map((tag: string) => tag.replace('#', ''));
    }

    // Get video URL or handle photo post
    let videoDownloadUrl = null;
    let videoStorageUrl = null;
    
    if (!isPhotoPost) {
      // Get video URL from video_versions array (highest quality)
      const videoVersions = media.video_versions || [];
      videoDownloadUrl = videoVersions.length > 0 ? videoVersions[0].url : null;
      if (!videoDownloadUrl) {
        throw new Error('No video URL found in Instagram API response');
      }
      console.log('Video download URL from Instagram API:', videoDownloadUrl);
      
      // Upload video to Supabase storage
      console.log('Uploading video to storage...');
      videoStorageUrl = await uploadVideoToStorage(
        supabase,
        videoDownloadUrl,
        shortcode,
        'instagram'
      );
    } else {
      console.log('Photo post detected, skipping video upload');
    }

    // Calculate duration from video_dash_manifest or use default
    let duration = 0;
    if (!isPhotoPost && media.video_dash_manifest) {
      // Try to extract duration from manifest
      const durationMatch = media.video_dash_manifest.match(/mediaPresentationDuration="PT([\d.]+)S"/);
      if (durationMatch) {
        duration = Math.round(parseFloat(durationMatch[1]));
      }
    }

    // Extract like count (different structure for reels vs posts)
    let likesCount = 0;
    if (isReel) {
      likesCount = media.like_count || 0;
    } else if (isFeedPost) {
      likesCount = media.edge_media_preview_like?.count || media.edge_liked_by?.count || 0;
    }
    
    // Extract comment count (different structure for reels vs posts)
    let commentsCount = 0;
    if (isReel) {
      commentsCount = media.comment_count || 0;
    } else if (isFeedPost) {
      commentsCount = media.edge_media_to_parent_comment?.count || media.edge_media_to_comment?.count || 0;
    }

    // Extract data
    const videoData: VideoData = {
      platform: 'instagram',
      sourceUrl,
      videoId: shortcode,
      accountUsername: owner.username || '',
      accountName: owner.full_name || owner.username || '',
      title: caption.substring(0, 100) || '', // First 100 chars as title
      description: caption || '',
      uploadDate: media.taken_at_timestamp ? new Date(media.taken_at_timestamp * 1000).toISOString() : (media.taken_at ? new Date(media.taken_at * 1000).toISOString() : null),
      duration: duration,
      // Instagram API doesn't provide view counts - try multiple possible fields
      viewsCount: media.view_count || media.play_count || media.video_view_count || 0,
      likesCount: likesCount,
      commentsCount: commentsCount,
      sharesCount: 0, // Instagram doesn't provide share count
      thumbnailUrl: media.image_versions2?.candidates?.[0]?.url || media.display_url || media.thumbnail_src || '',
    };

    if (videoStorageUrl) {
      videoData.videoUrl = videoStorageUrl;
    }

    // Upload thumbnail and avatar images
    console.log('Uploading thumbnail and avatar images...');
    const thumbnailUrl = isPhotoPost 
      ? (imageUrls.length > 0 ? imageUrls[0] : media.display_url || media.thumbnail_src)
      : (media.image_versions2?.candidates?.[0]?.url || media.display_uri || '');
    
    const thumbnailStorageUrl = await uploadImageToStorage(
      supabase,
      thumbnailUrl,
      shortcode,
      'instagram',
      'thumbnail'
    );

    const avatarStorageUrl = await uploadImageToStorage(
      supabase,
      owner.profile_pic_url || owner.hd_profile_pic_url_info?.url || '',
      shortcode,
      'instagram',
      'avatar'
    );

    // Upload all carousel images to Supabase Storage to avoid CORS issues
    let uploadedImageUrls: string[] = [];
    if (isPhotoPost && imageUrls.length > 0) {
      console.log(`Uploading ${imageUrls.length} carousel images to storage...`);
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const imageStorageUrl = await uploadImageToStorage(
            supabase,
            imageUrls[i],
            `${shortcode}-img-${i}`,
            'instagram',
            'carousel'
          );
          uploadedImageUrls.push(imageStorageUrl);
          console.log(`Uploaded image ${i + 1}/${imageUrls.length}`);
        } catch (error) {
          console.error(`Failed to upload image ${i}:`, error);
          // Continue with other images even if one fails
        }
      }
      console.log(`Successfully uploaded ${uploadedImageUrls.length}/${imageUrls.length} images`);
    }

    // Extract music info from clips_metadata
    const clipsMetadata = media.clips_metadata || {};
    const originalSoundInfo = clipsMetadata.original_sound_info || {};
    const musicInfo = clipsMetadata.music_info || {};

    // Insert into video_library
    const { data: libraryVideo, error: insertError } = await supabase
      .from('video_library')
      .insert({
        // Basic info
        platform: videoData.platform,
        source_url: videoData.sourceUrl,
        video_id: videoData.videoId,
        account_username: videoData.accountUsername,
        account_name: videoData.accountName,
        title: videoData.title,
        description: videoData.description,
        upload_date: videoData.uploadDate,
        duration: videoData.duration,
        
        // Stats
        views_count: videoData.viewsCount,
        likes_count: videoData.likesCount,
        comments_count: videoData.commentsCount,
        shares_count: videoData.sharesCount,
        collect_count: 0,
        repost_count: 0,
        
        // Media URLs
        video_url: videoData.videoUrl,
        thumbnail_url: videoData.thumbnailUrl,
        thumbnail_storage_url: thumbnailStorageUrl,
        cover_image_url: media.display_url || media.display_uri || '',
        dynamic_cover_url: '',
        
        // Photo post data
        is_photo_post: isPhotoPost,
        image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : (imageUrls.length > 0 ? imageUrls : null),
        
        // Creator stats
        follower_count: 0, // Not provided in new API
        creator_heart_count: 0,
        creator_video_count: 0, // Not provided in new API
        creator_avatar_url: owner.profile_pic_url || '',
        creator_avatar_storage_url: avatarStorageUrl,
        
        // Music info - from clips_metadata
        music_title: originalSoundInfo.original_audio_title || musicInfo.song_name || '',
        music_author: originalSoundInfo.ig_artist?.username || musicInfo.artist_name || '',
        is_original_sound: clipsMetadata.audio_type === 'original_sounds',
        music_url: '',
        music_album: '',
        music_cover_large: '',
        music_cover_medium: '',
        music_cover_thumb: '',
        music_video_count: 0,
        music_is_copyrighted: originalSoundInfo.is_explicit || false,
        spotify_id: null,
        apple_music_id: null,
        
        // Location
        location_name: media.location?.name || '',
        location_city: '',
        location_country: '',
        location_address: media.location?.address || '',
        
        // Video technical details
        video_quality: '',
        video_bitrate: 0,
        video_width: media.original_width || 0,
        video_height: media.original_height || 0,
        video_codec: '',
        
        // Complex data
        raw_api_data: apiResponse,
        challenges: [],
        text_extra: [],
        subtitles: [],
        anchors: [],
        
        // Flags
        is_ad: media.is_ad || false,
        duet_enabled: false,
        stitch_enabled: false,
        share_enabled: media.viewer_can_reshare || true,
        
        // Additional metadata
        text_language: null,
        diversification_labels: [],
        suggested_words: [],
        hashtags: hashtags,
        
        // Categorization
        genre: genre,
        category: category,
        type: type,
        actor: actor,
        
        processing_status: 'completed',
        is_published: true,
        created_by: createdBy,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert video: ${insertError.message}`);
    }

    // Update queue status to completed
    await supabase
      .from('video_library_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        video_library_id: libraryVideo.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    console.log('Instagram reel processed successfully:', libraryVideo.id);

    // Automatically trigger Gemini AI analysis
    try {
      console.log('Triggering Gemini AI analysis for Instagram reel:', libraryVideo.id);
      const analysisResponse = await supabase.functions.invoke('analyze-video-gemini', {
        body: { videoId: libraryVideo.id }
      });
      
      if (analysisResponse.error) {
        console.error('Failed to trigger Gemini analysis:', analysisResponse.error);
      } else {
        console.log('Gemini analysis triggered successfully');
      }
    } catch (analysisError) {
      console.error('Error triggering Gemini analysis:', analysisError);
      // Don't fail the whole process if analysis fails
    }
  } catch (error) {
    console.error('Error processing Instagram reel:', error);

    // Update queue with error
    await supabase
      .from('video_library_queue')
      .update({
        status: 'failed',
        error_message: error.message,
        retry_count: supabase.from('video_library_queue').select('retry_count').eq('id', queueId).single().then((r: any) => (r.data?.retry_count || 0) + 1),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { queueId, sourceUrl, platform, createdBy, genre, category, type, actor } = await req.json();

    if (!queueId || !sourceUrl || !platform) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (platform === 'tiktok') {
      await processTikTokVideo(supabaseClient, queueId, sourceUrl, createdBy, genre, category, type, actor);
    } else if (platform === 'instagram') {
      await processInstagramReel(supabaseClient, queueId, sourceUrl, createdBy, genre, category, type, actor);
    } else {
      throw new Error('Unsupported platform');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Video processed successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
