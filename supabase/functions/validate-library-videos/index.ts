// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validates video files in the library by checking if they can be properly loaded
 * Marks corrupted videos with processing_error
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { limit = 50, offset = 0 } = await req.json().catch(() => ({}));

    console.log(`Validating videos with limit ${limit}, offset ${offset}`);

    // Get videos to validate
    const { data: videos, error: fetchError } = await supabaseClient
      .from('video_library')
      .select('id, video_url, platform, video_id')
      .eq('processing_status', 'completed')
      .is('processing_error', null)
      .not('video_url', 'is', null)
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${videos?.length || 0} videos to validate`);

    const results = {
      total: videos?.length || 0,
      valid: 0,
      corrupted: 0,
      errors: [] as any[],
    };

    for (const video of videos || []) {
      try {
        console.log(`Validating video ${video.id}: ${video.video_url}`);

        // Try to fetch the video and check basic properties
        const response = await fetch(video.video_url, { method: 'HEAD' });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');

        console.log(`Video ${video.id}: ${contentLength} bytes, ${contentType}`);

        // Check if file is too small (likely corrupted)
        if (contentLength && parseInt(contentLength) < 10240) {
          throw new Error(`File too small: ${contentLength} bytes`);
        }

        // For more thorough validation, download first 12 bytes to check MP4 signature
        const partialResponse = await fetch(video.video_url, {
          headers: { 'Range': 'bytes=0-11' }
        });

        if (partialResponse.ok) {
          const buffer = await partialResponse.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          
          // Check for ftyp box (MP4 signature) at bytes 4-7
          const hasMP4Signature = bytes.length >= 8 &&
                                  bytes[4] === 0x66 && bytes[5] === 0x74 && 
                                  bytes[6] === 0x79 && bytes[7] === 0x70;
          
          if (!hasMP4Signature) {
            throw new Error('Missing MP4 signature (ftyp box)');
          }
        }

        results.valid++;
        console.log(`✓ Video ${video.id} is valid`);

      } catch (error) {
        console.error(`✗ Video ${video.id} is corrupted:`, error.message);
        
        results.corrupted++;
        results.errors.push({
          id: video.id,
          video_url: video.video_url,
          error: error.message,
        });

        // Mark video as having an error
        await supabaseClient
          .from('video_library')
          .update({
            processing_error: `Video file corrupted: ${error.message}`,
            processing_status: 'failed',
          })
          .eq('id', video.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error validating videos:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
