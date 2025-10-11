// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// @ts-ignore - Deno global object
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Helper function to upload video to storage
async function uploadVideoToStorage(
  supabase: any,
  videoUrl: string,
  videoId: string
): Promise<string | null> {
  try {
    console.log(`📥 [DOWNLOAD] Downloading video from: ${videoUrl}`)
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.blob();
    const fileName = `tiktok-trending-${videoId}-${Date.now()}.mp4`;

    console.log(`📤 [UPLOAD] Uploading ${fileName} to storage (${videoBlob.size} bytes)`)
    const { data, error } = await supabase.storage
      .from('library-videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('library-videos')
      .getPublicUrl(fileName);

    console.log(`✅ [SUCCESS] Video uploaded: ${urlData.publicUrl}`)
    return urlData.publicUrl;
  } catch (error) {
    console.error(`❌ [ERROR] Video upload failed:`, error);
    return null;
  }
}

// Helper function to upload image to storage
async function uploadImageToStorage(
  supabase: any,
  imageUrl: string,
  videoId: string,
  type: string
): Promise<string | null> {
  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return null;
    }

    const imageBlob = await imageResponse.blob();
    const extension = imageBlob.type.split('/')[1] || 'jpg';
    const fileName = `tiktok-trending-${videoId}-${type}-${Date.now()}.${extension}`;

    const { data, error } = await supabase.storage
      .from('library-videos')
      .upload(fileName, imageBlob, {
        contentType: imageBlob.type,
        upsert: false,
      });

    if (error) {
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('library-videos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    return null;
  }
}

serve(async (req) => {
  const startTime = Date.now()
  console.log('🚀 [START] Download job started')

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { videoId } = await req.json()

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing videoId parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 [PROCESS] Processing video ${videoId}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get the recommendation record
    const { data: recommendation, error: fetchError } = await supabase
      .from('video_library_recommendations')
      .select('*')
      .eq('video_id', videoId)
      .single()

    if (fetchError || !recommendation) {
      throw new Error(`Video ${videoId} not found in recommendations`)
    }

    // Update status to processing
    await supabase
      .from('video_library_recommendations')
      .update({ processing_status: 'processing' })
      .eq('id', recommendation.id)

    // Get post details from RapidAPI for complete author data
    console.log(`📋 [RAPIDAPI] Fetching post details for ${videoId}`)
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY') || '14f8e13cf8msh72d1c5e7c21cce5p1fde48jsne68dcd853309'
    const postDetailUrl = `https://tiktok-api23.p.rapidapi.com/api/post/detail?videoId=${videoId}`
    
    let followerCount = null
    let avatarUrl = null
    
    try {
      const detailResponse = await fetch(postDetailUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
        }
      })
      
      if (detailResponse.ok) {
        const detailData = await detailResponse.json()
        if (detailData.statusCode === 0 && detailData.itemInfo?.itemStruct) {
          followerCount = detailData.itemInfo.itemStruct.authorStats?.followerCount
          avatarUrl = detailData.itemInfo.itemStruct.author?.avatarThumb
          console.log(`✅ [RAPIDAPI] Got author data - followers: ${followerCount}`)
        }
      }
    } catch (error) {
      console.warn(`⚠️ [RAPIDAPI] Failed to fetch post details:`, error.message)
    }

    // Get download URL from tikwm.com
    console.log(`🔗 [TIKWM] Fetching data for ${videoId}`)
    const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(recommendation.source_url)}&hd=1`
    const tikwmResponse = await fetch(tikwmUrl)
    const tikwmData = await tikwmResponse.json()

    // Check if this is a photo slideshow
    const isPhotoPost = tikwmData.data?.images && tikwmData.data.images.length > 0
    console.log(`📸 [TYPE] ${isPhotoPost ? 'Photo slideshow' : 'Video'} detected`)

    let videoStorageUrl = null
    let imageUrls: string[] = []

    if (isPhotoPost) {
      // Handle photo slideshow
      console.log(`📸 [PHOTOS] Processing ${tikwmData.data.images.length} images...`)
      
      for (let i = 0; i < tikwmData.data.images.length; i++) {
        const imageUrl = tikwmData.data.images[i]
        console.log(`🖼️ [IMAGE ${i + 1}] Uploading...`)
        
        const imageStorageUrl = await uploadImageToStorage(
          supabase,
          imageUrl,
          videoId,
          `slide-${i}`
        )
        
        if (imageStorageUrl) {
          imageUrls.push(imageStorageUrl)
        }
      }
      
      console.log(`✅ [PHOTOS] Uploaded ${imageUrls.length} images`)
    } else {
      // Handle video
      const videoDownloadUrl = tikwmData.data?.hdplay || tikwmData.data?.play
      
      if (!videoDownloadUrl) {
        throw new Error('No download URL available from tikwm.com')
      }

      console.log(`✅ [TIKWM] Got video download URL`)
      videoStorageUrl = await uploadVideoToStorage(supabase, videoDownloadUrl, videoId)
    }

    // Upload thumbnail
    console.log(`🖼️ [THUMBNAIL] Uploading thumbnail`)
    const thumbnailStorageUrl = await uploadImageToStorage(
      supabase,
      recommendation.thumbnail_url,
      videoId,
      'thumbnail'
    )

    // Upload avatar (use RapidAPI avatar if available, otherwise use existing)
    console.log(`👤 [AVATAR] Uploading avatar`)
    const avatarToUpload = avatarUrl || recommendation.creator_avatar_url
    const avatarStorageUrl = await uploadImageToStorage(
      supabase,
      avatarToUpload,
      videoId,
      'avatar'
    )

    // Update recommendation with storage URLs
    const updateData: any = {
      thumbnail_storage_url: thumbnailStorageUrl,
      creator_avatar_storage_url: avatarStorageUrl,
      processing_status: (videoStorageUrl || imageUrls.length > 0) ? 'completed' : 'failed',
      processing_error: (videoStorageUrl || imageUrls.length > 0) ? null : 'Failed to download content',
      is_photo_post: isPhotoPost,
    }
    
    // Add follower count if we got it from RapidAPI
    if (followerCount !== null) {
      updateData.follower_count = followerCount
    }

    if (isPhotoPost) {
      updateData.image_urls = imageUrls
    } else {
      updateData.video_url = videoStorageUrl
    }

    const { error: updateError } = await supabase
      .from('video_library_recommendations')
      .update(updateData)
      .eq('id', recommendation.id)

    if (updateError) {
      throw new Error(`Failed to update recommendation: ${updateError.message}`)
    }

    const totalDuration = Date.now() - startTime
    console.log(`✅ [COMPLETE] Video ${videoId} processed in ${totalDuration}ms`)

    // Trigger AI analysis in background (fire and forget)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (videoStorageUrl || imageUrls.length > 0) {
      console.log(`🤖 [AI] Triggering analysis for video ${videoId}...`)
      fetch(`${supabaseUrl}/functions/v1/analyze-trending-gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ videoId }),
      }).catch((error) => {
        console.error('Failed to trigger AI analysis:', error)
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoId,
        videoStorageUrl,
        duration: totalDuration
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error('💥 [ERROR] Download job failed:', {
      message: error.message,
      stack: error.stack,
      duration: `${totalDuration}ms`,
    })

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to download video',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
