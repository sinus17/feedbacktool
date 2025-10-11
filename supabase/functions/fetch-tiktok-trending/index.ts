// @ts-ignore - Deno runtime import (IDE shows error but works in Supabase Edge Functions)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// @ts-ignore - Deno global object (available in Deno runtime, not in Node.js)
const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY') || '14f8e13cf8msh72d1c5e7c21cce5p1fde48jsne68dcd853309'
const RAPIDAPI_HOST = 'tiktok-api23.p.rapidapi.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RequestParams {
  count?: number
}

// Helper function to upload video to storage
async function uploadVideoToStorage(
  supabase: any,
  videoUrl: string,
  videoId: string
): Promise<string | null> {
  try {
    // Download video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download video from source');
    }

    const videoBlob = await videoResponse.blob();
    const fileName = `tiktok-trending-${videoId}-${Date.now()}.mp4`;

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
  } catch (error) {
    console.error('Error uploading video:', error);
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
  console.log('🚀 [START] Incoming request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ [CORS] Handling preflight request')
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Get query parameters from request
    const url = new URL(req.url)
    const params: RequestParams = {
      count: Math.min(parseInt(url.searchParams.get('count') || '16'), 30), // Max 30 trending posts
    }

    console.log('📋 [PARAMS] Parsed request parameters:', params)

    // Build TikTok Trending Posts API URL
    const tiktokApiUrl = `https://tiktok-api23.p.rapidapi.com/api/post/trending?count=${params.count}`

    console.log('🔗 [API] Fetching trending posts from TikTok API:', tiktokApiUrl)
    console.log('🔑 [API] Using API key:', RAPIDAPI_KEY ? `${RAPIDAPI_KEY.substring(0, 10)}...` : 'NOT SET')

    // Fetch from TikTok API
    const fetchStart = Date.now()
    const response = await fetch(tiktokApiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    })
    const fetchDuration = Date.now() - fetchStart

    console.log('📡 [RESPONSE] TikTok API responded:', {
      status: response.status,
      statusText: response.statusText,
      duration: `${fetchDuration}ms`,
      headers: Object.fromEntries(response.headers.entries()),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [ERROR] TikTok API error response:', errorText)
      throw new Error(`TikTok API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const responseText = await response.text()
    console.log('📄 [RESPONSE] Response length:', responseText.length)
    
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from TikTok API')
    }
    
    const data = JSON.parse(responseText)
    console.log('✅ [SUCCESS] Trending posts received:', {
      statusCode: data.statusCode,
      itemCount: data.itemList?.length || 0,
      hasMore: data.hasMore,
      cursor: data.cursor,
    })

    // Auto-save trending posts to recommendations table
    if (data.statusCode === 0 && data.itemList && data.itemList.length > 0) {
      console.log('💾 [DB] Saving trending posts to recommendations table...')
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      
      const saveStart = Date.now()
      let savedCount = 0
      let skippedCount = 0

      for (const post of data.itemList) {
        try {
          // Check if this video already exists in recommendations
          const { data: existing } = await supabase
            .from('video_library_recommendations')
            .select('id')
            .eq('video_id', post.id)
            .single()

          if (existing) {
            skippedCount++
            console.log(`⏭️ [SKIP] Video ${post.id} already exists`)
            continue
          }

          // Construct URLs
          const tiktokUrl = `https://www.tiktok.com/@${post.author.uniqueId}/video/${post.id}`
          
          // Extract hashtags from description
          let hashtags: string[] = []
          if (post.desc) {
            const hashtagRegex = /#[\w]+/g
            const descHashtags = post.desc.match(hashtagRegex) || []
            hashtags = descHashtags.map((tag: string) => tag.replace('#', ''))
          }

          // Insert new recommendation (metadata only - no downloads)
          const { error: insertError } = await supabase
            .from('video_library_recommendations')
            .insert({
              platform: 'tiktok',
              source_url: tiktokUrl,
              video_id: post.id,
              title: post.desc || 'Trending Post',
              account_name: post.author.nickname,
              account_username: post.author.uniqueId,
              likes_count: post.stats.diggCount,
              views_count: post.stats.playCount,
              comments_count: post.stats.commentCount,
              shares_count: post.stats.shareCount,
              collect_count: post.stats.collectCount,
              thumbnail_url: post.video.cover,
              duration: post.video.duration,
              follower_count: post.authorStats.followerCount,
              creator_avatar_url: post.author.avatarThumb,
              music_title: post.music.title,
              music_author: post.music.authorName,
              is_original_sound: post.music.original,
              hashtags: hashtags,
              recommendation_source: 'tiktok_trending_api',
              processing_status: 'pending',
              is_published: false,
            })

          if (insertError) {
            console.error(`❌ [DB ERROR] Failed to save video ${post.id}:`, insertError.message)
          } else {
            savedCount++
            console.log(`✅ [SAVED] Video ${post.id} saved to recommendations`)
            
            // Trigger download function asynchronously (fire and forget)
            fetch(`${SUPABASE_URL}/functions/v1/download-tiktok-trending`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ videoId: post.id }),
            }).catch(err => {
              console.error(`⚠️ [ASYNC] Failed to trigger download for ${post.id}:`, err.message)
            })
          }
        } catch (err) {
          console.error(`❌ [ERROR] Exception saving video ${post.id}:`, err.message)
        }
      }

      const saveDuration = Date.now() - saveStart
      console.log(`💾 [DB] Saved ${savedCount} new posts, skipped ${skippedCount} existing posts (${saveDuration}ms)`)
    }

    const totalDuration = Date.now() - startTime
    console.log(`🏁 [END] Request completed in ${totalDuration}ms`)

    // Return the trending posts data
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Response-Time': `${totalDuration}ms`,
      },
    })
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error('💥 [ERROR] Exception caught:', {
      message: error.message,
      stack: error.stack,
      duration: `${totalDuration}ms`,
    })
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to fetch trending posts',
        statusCode: -1,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Response-Time': `${totalDuration}ms`,
        },
      }
    )
  }
})
