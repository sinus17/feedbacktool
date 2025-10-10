// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-timezone',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { videoId } = await req.json()
    
    if (!videoId) {
      throw new Error('Video ID is required')
    }

    console.log('Analyzing video with Gemini:', videoId)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get video details
    const { data: video, error: videoError } = await supabaseClient
      .from('video_library')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      throw new Error('Video not found')
    }

    console.log('Video found:', video.video_id)
    console.log('Is photo post:', video.is_photo_post)

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    let fileUris = []
    let fileNames = []
    let isPhotoPost = video.is_photo_post && video.image_urls && video.image_urls.length > 0

    if (isPhotoPost) {
      // Handle photo slideshow - upload each image
      console.log(`Uploading ${video.image_urls.length} images to Gemini File API...`)
      
      for (let i = 0; i < video.image_urls.length; i++) {
        const imageUrl = video.image_urls[i]
        console.log(`Uploading image ${i + 1}/${video.image_urls.length}...`)
        
        // Download image
        const imageResponse = await fetch(imageUrl)
        const imageBlob = await imageResponse.blob()
        const imageBuffer = await imageBlob.arrayBuffer()
        const mimeType = imageBlob.type || 'image/jpeg'

        // Upload to Gemini File API
        const uploadResponse = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: {
              'X-Goog-Upload-Protocol': 'resumable',
              'X-Goog-Upload-Command': 'start',
              'X-Goog-Upload-Header-Content-Length': imageBuffer.byteLength.toString(),
              'X-Goog-Upload-Header-Content-Type': mimeType,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file: {
                display_name: `photo_${video.video_id}_${i}.jpg`,
              }
            })
          }
        )

        const uploadUrl = uploadResponse.headers.get('X-Goog-Upload-URL')
        if (!uploadUrl) {
          throw new Error(`Failed to get upload URL for image ${i + 1}`)
        }

        // Upload the actual image bytes
        const uploadBytesResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Length': imageBuffer.byteLength.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize',
          },
          body: imageBuffer,
        })

        const fileData = await uploadBytesResponse.json()
        console.log(`Image ${i + 1} uploaded:`, fileData.file.name)

        fileUris.push(fileData.file.uri)
        fileNames.push(fileData.file.name)

        // Wait for file to be processed
        let fileState = 'PROCESSING'
        let attempts = 0
        const maxAttempts = 15

        while (fileState === 'PROCESSING' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const stateResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${fileData.file.name}?key=${geminiApiKey}`
          )
          const stateData = await stateResponse.json()
          fileState = stateData.state
          
          attempts++
        }

        if (fileState !== 'ACTIVE') {
          console.warn(`Image ${i + 1} processing timeout, continuing anyway`)
        }
      }
    } else {
      // Handle video - original logic
      console.log('Uploading video to Gemini File API...')
      const videoUrl = video.video_url

      // Download video first
      const videoResponse = await fetch(videoUrl)
      const videoBlob = await videoResponse.blob()
      const videoBuffer = await videoBlob.arrayBuffer()

      // Upload to Gemini File API
      const uploadResponse = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': videoBuffer.byteLength.toString(),
            'X-Goog-Upload-Header-Content-Type': 'video/mp4',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: {
              display_name: `video_${video.video_id}.mp4`,
            }
          })
        }
      )

      const uploadUrl = uploadResponse.headers.get('X-Goog-Upload-URL')
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL')
      }

      console.log('Got upload URL, uploading video bytes...')

      // Upload the actual video bytes
      const uploadBytesResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': videoBuffer.byteLength.toString(),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: videoBuffer,
      })

      const fileData = await uploadBytesResponse.json()
      console.log('Video uploaded:', fileData)

      fileUris.push(fileData.file.uri)
      fileNames.push(fileData.file.name)

      // Wait for file to be processed
      console.log('Waiting for file to be processed...')
      let fileState = 'PROCESSING'
      let attempts = 0
      const maxAttempts = 30

      while (fileState === 'PROCESSING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const stateResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${fileData.file.name}?key=${geminiApiKey}`
        )
        const stateData = await stateResponse.json()
        fileState = stateData.state
        
        console.log(`File state: ${fileState} (attempt ${attempts + 1}/${maxAttempts})`)
        attempts++
      }

      if (fileState !== 'ACTIVE') {
        throw new Error(`File processing failed or timed out. State: ${fileState}`)
      }
    }

    // Step 2: Analyze with Gemini
    console.log(`Analyzing ${isPhotoPost ? 'photo slideshow' : 'video'} with Gemini 2.0 Flash...`)
    
    const analysisPrompt = isPhotoPost 
      ? `Analysiere diese TikTok-Foto-Slideshow im Detail und liefere Erkenntnisse im folgenden JSON-Format:

{
  "hook": "Kurze, prägnante Beschreibung des Eröffnungs-Hooks (max. 1-2 Sätze)",
  "content_type": "Art des Inhalts (z.B. Tutorial, Unterhaltung, Storytelling, etc.)",
  "visual_style": "Beschreibung des visuellen Stils, der Bearbeitung und Ästhetik",
  "photo_sequence": ["Detaillierte Beschreibung jedes Fotos IN DER REIHENFOLGE: Was ist zu sehen, welcher Text wird verwendet, welche Botschaft wird vermittelt"],
  "text_strategy": "Analyse der verwendeten Texte: Wie werden Texte eingesetzt, welche Sprache/Tonalität, wie unterstützen sie die Botschaft",
  "why_it_works": "Detaillierte Erklärung, warum diese Foto-Slideshow funktioniert und Engagement erzeugt",
  "required_photos": ["Liste der benötigten Foto-Typen/Szenen, um eine ähnliche Slideshow zu erstellen"],
  "engagement_factors": ["Array spezifischer Faktoren, die das Engagement fördern"]
}

WICHTIG:
- Analysiere JEDES Foto in der Reihenfolge (Foto 1, Foto 2, etc.)
- Achte besonders auf verwendete Texte und deren Wirkung
- Erkläre den Kontext und die Story, die durch die Foto-Abfolge erzählt wird
- Sei spezifisch und umsetzbar
- ANTWORTE AUF DEUTSCH`
      : `Analysiere dieses TikTok-Video im Detail und liefere Erkenntnisse im folgenden JSON-Format:

{
  "hook": "Kurze, prägnante Beschreibung des Eröffnungs-Hooks (max. 1-2 Sätze)",
  "content_type": "Art des Inhalts (z.B. Tutorial, Unterhaltung, Storytelling, etc.)",
  "visual_style": "Beschreibung des visuellen Stils, der Bearbeitung und Ästhetik",
  "shotlist": ["Detaillierte Aufschlüsselung jeder Szene/Einstellung in der Reihenfolge, die die Videostruktur erklärt und zeigt, was zur Nachstellung benötigt wird"],
  "engagement_factors": ["Array spezifischer Faktoren, die das Engagement fördern"]
}

WICHTIG:
- Halte die Hook-Beschreibung KURZ und auf den Punkt (max. 2 Sätze)
- Die Shotlist sollte eine detaillierte Szene-für-Szene-Aufschlüsselung sein, die die Videostruktur erklärt und das Konzept/die Pointe deutlich macht
- Fokussiere darauf, was dieses Video funktionieren lässt und wie es strukturiert ist
- Sei spezifisch und umsetzbar
- ANTWORTE AUF DEUTSCH`

    // Build parts array with text prompt and media files
    const parts = [{ text: analysisPrompt }]
    
    // Add all files (images or video)
    for (let i = 0; i < fileUris.length; i++) {
      parts.push({
        fileData: {
          mimeType: isPhotoPost ? 'image/jpeg' : 'video/mp4',
          fileUri: fileUris[i]
        }
      })
    }

    const analyzeResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    const analysisData = await analyzeResponse.json()
    console.log('Analysis complete')

    // Extract the analysis text
    const analysisText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Try to parse JSON from the response
    let analysisJson
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || analysisText.match(/```\n([\s\S]*?)\n```/)
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText
      analysisJson = JSON.parse(jsonText)
    } catch (e) {
      console.error('Failed to parse JSON, storing raw text')
      analysisJson = {
        raw_analysis: analysisText,
        error: 'Failed to parse structured JSON'
      }
    }

    // Extract key insights for the legacy fields - use full text, not compressed
    const contentDescription = [
      analysisJson.hook,
      analysisJson.content_type,
      analysisJson.visual_style,
      analysisJson.pacing
    ].filter(Boolean).join(' ')
    
    const whyItWorks = analysisJson.engagement_factors 
      ? (Array.isArray(analysisJson.engagement_factors) 
          ? '• ' + analysisJson.engagement_factors.join('\n• ') 
          : analysisJson.engagement_factors)
      : ''
    
    const artistRecommendation = analysisJson.improvement_suggestions
      ? (Array.isArray(analysisJson.improvement_suggestions)
          ? '• ' + analysisJson.improvement_suggestions.join('\n• ')
          : analysisJson.improvement_suggestions)
      : ''

    // Save analysis to database (both new and legacy fields)
    const { error: updateError } = await supabaseClient
      .from('video_library')
      .update({
        gemini_analysis: analysisJson,
        gemini_analyzed_at: new Date().toISOString(),
        content_description: contentDescription,
        why_it_works: whyItWorks,
        artist_recommendation: artistRecommendation
      })
      .eq('id', videoId)

    if (updateError) {
      throw updateError
    }

    // Clean up: Delete all uploaded files from Gemini
    try {
      for (const fileName of fileNames) {
        await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiApiKey}`,
          { method: 'DELETE' }
        )
      }
      console.log(`Cleaned up ${fileNames.length} uploaded file(s)`)
    } catch (e) {
      console.error('Failed to delete files:', e)
    }

    if (updateError) {
      throw updateError
    }

    // Trigger English translation in background (fire and forget)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    fetch(`${supabaseUrl}/functions/v1/translate-gemini-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ videoId, targetLang: 'en' }),
    }).catch((error) => {
      console.error('Failed to trigger English translation:', error);
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: analysisJson
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
