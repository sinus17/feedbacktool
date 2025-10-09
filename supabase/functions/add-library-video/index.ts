// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

function detectPlatform(url: string): 'tiktok' | 'instagram' | null {
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) {
    return 'tiktok';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-timezone',
      },
    });
  }

  try {
    console.log('Request received');
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('Getting user...');
    
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    console.log('User:', user?.id, 'Error:', userError);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    console.log('Parsing request body...');
    const body = await req.json();
    console.log('Body:', body);
    
    const { sourceUrl, genre, category, type, actor } = body;

    if (!sourceUrl) {
      console.log('Missing sourceUrl');
      return new Response(
        JSON.stringify({ error: 'Missing sourceUrl' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    console.log('Detecting platform...');
    // Detect platform
    const platform = detectPlatform(sourceUrl);
    console.log('Platform:', platform);
    
    if (!platform) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL. Must be a TikTok or Instagram URL.' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    console.log('Checking if video exists in library...');
    // Check if URL already exists in library
    const { data: existingVideo, error: checkError } = await supabaseClient
      .from('video_library')
      .select('id')
      .eq('source_url', sourceUrl)
      .maybeSingle();
    
    console.log('Existing video check:', { existingVideo, checkError });

    // If video exists, delete it and reprocess
    if (existingVideo) {
      console.log('Video exists, deleting for reprocessing...');
      const { error: deleteError } = await supabaseClient
        .from('video_library')
        .delete()
        .eq('id', existingVideo.id);
      
      if (deleteError) {
        console.error('Error deleting existing video:', deleteError);
      } else {
        console.log('Existing video deleted successfully');
      }
    }

    // Check if URL already exists in queue
    console.log('Checking if video is in queue...');
    const { data: existingQueue } = await supabaseClient
      .from('video_library_queue')
      .select('id, status')
      .eq('source_url', sourceUrl)
      .in('status', ['queued', 'processing'])
      .maybeSingle();

    console.log('Queue check:', existingQueue);

    if (existingQueue) {
      console.log('Video already in queue, deleting and re-adding to force reprocessing');
      // Delete existing queue item to force reprocessing
      await supabaseClient
        .from('video_library_queue')
        .delete()
        .eq('id', existingQueue.id);
      console.log('Existing queue item deleted, will create new one');
    }

    // Add to queue
    const { data: queueItem, error: queueError } = await supabaseClient
      .from('video_library_queue')
      .insert({
        platform,
        source_url: sourceUrl,
        status: 'queued',
        created_by: user.id,
      })
      .select()
      .single();

    if (queueError) {
      throw new Error(`Failed to add to queue: ${queueError.message}`);
    }

    // Trigger processing in background AFTER returning response
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Don't await this - let it run in background
    fetch(`${supabaseUrl}/functions/v1/process-library-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        queueId: queueItem.id,
        sourceUrl,
        platform,
        createdBy: user.id,
        genre,
        category,
        type,
        actor,
      }),
    }).catch((error) => {
      console.error('Failed to trigger processing:', error);
    });

    // Return success immediately
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Video added to processing queue',
        queueId: queueItem.id,
      }),
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
