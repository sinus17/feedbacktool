// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get next pending job with highest priority
    const { data: jobs, error: fetchError } = await supabaseClient
      .from('video_library_recommendations_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
    
    if (fetchError) {
      throw fetchError
    }

    const job = jobs && jobs.length > 0 ? jobs[0] : null

    if (fetchError || !job) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs in queue' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Processing job ${job.id} for video ${job.video_id}, type: ${job.job_type}`)

    // Mark as processing
    await supabaseClient
      .from('video_library_recommendations_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    // Process the job
    let success = false
    let errorMessage = null

    try {
      if (job.job_type === 'analyze') {
        // Call analyze-trending-gemini
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-trending-gemini`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({ videoId: job.video_id })
          }
        )

        if (response.ok) {
          success = true
          console.log(`✅ Successfully analyzed video ${job.video_id}`)
        } else {
          const error = await response.text()
          errorMessage = `Analysis failed: ${error}`
          console.error(errorMessage)
        }
      } else if (job.job_type === 'translate') {
        // Call translate-gemini-analysis
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/translate-gemini-analysis`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({ 
              videoId: job.video_id,
              targetLang: 'en',
              isTrending: true
            })
          }
        )

        if (response.ok) {
          success = true
          console.log(`✅ Successfully translated video ${job.video_id}`)
        } else {
          const error = await response.text()
          errorMessage = `Translation failed: ${error}`
          console.error(errorMessage)
        }
      }
    } catch (error) {
      errorMessage = error.message
      console.error(`Error processing job:`, error)
    }

    // Update job status
    if (success) {
      await supabaseClient
        .from('video_library_recommendations_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
    } else {
      // Check if we should retry or mark as failed
      const newStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending'
      
      await supabaseClient
        .from('video_library_recommendations_queue')
        .update({
          status: newStatus,
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
    }

    return new Response(
      JSON.stringify({
        success,
        job_id: job.id,
        video_id: job.video_id,
        job_type: job.job_type,
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Queue processor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
