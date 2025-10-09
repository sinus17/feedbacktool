// @ts-nocheck - This file runs in Deno runtime, not Node.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find videos stuck in processing for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckVideos, error: fetchError } = await supabaseClient
      .from('video_library_queue')
      .select('id, source_url, status, created_at')
      .eq('status', 'processing')
      .lt('created_at', tenMinutesAgo);

    if (fetchError) {
      console.error('Error fetching stuck videos:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${stuckVideos?.length || 0} stuck videos`);

    if (!stuckVideos || stuckVideos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No stuck videos found',
          cleaned: 0
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update stuck videos to failed status
    const { error: updateError } = await supabaseClient
      .from('video_library_queue')
      .update({ 
        status: 'failed',
        error_message: 'Video processing timed out (stuck for more than 10 minutes)',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'processing')
      .lt('created_at', tenMinutesAgo);

    if (updateError) {
      console.error('Error updating stuck videos:', updateError);
      throw updateError;
    }

    console.log(`Marked ${stuckVideos.length} videos as failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${stuckVideos.length} stuck videos`,
        cleaned: stuckVideos.length,
        videos: stuckVideos.map(v => ({ id: v.id, url: v.source_url }))
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
