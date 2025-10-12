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

    console.log('Analyzing trending video with Gemini:', videoId)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to get video from recommendations table first, then fall back to video_library
    let video = null
    let isTrendingVideo = false
    
    const { data: trendingVideo, error: trendingError } = await supabaseClient
      .from('video_library_recommendations')
      .select('*')
      .eq('video_id', videoId)
      .single()

    if (trendingVideo && !trendingError) {
      video = trendingVideo
      isTrendingVideo = true
      console.log('Found in recommendations table')
    } else {
      // Try video_library table
      const { data: libraryVideo, error: libraryError } = await supabaseClient
        .from('video_library')
        .select('*')
        .eq('id', videoId)
        .single()

      if (libraryError || !libraryVideo) {
        throw new Error('Video not found in recommendations or library')
      }
      
      video = libraryVideo
      isTrendingVideo = false
      console.log('Found in video_library table')
    }

    console.log('Trending video found:', video.video_id)
    console.log('Is photo post:', video.is_photo_post)
    console.log('Has video URL:', !!video.video_url)
    console.log('Has image URLs:', video.image_urls?.length || 0)

    const isPhotoPost = video.is_photo_post && video.image_urls && video.image_urls.length > 0

    if (!isPhotoPost && !video.video_url) {
      throw new Error('Video file not yet downloaded')
    }

    if (isPhotoPost && (!video.image_urls || video.image_urls.length === 0)) {
      throw new Error('Photo slideshow images not yet downloaded')
    }

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    let fileUris = []
    let fileNames = []

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
                display_name: `trending_photo_${video.video_id}_${i}.jpg`,
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
        const maxAttempts = 60

        while (fileState === 'PROCESSING' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000))
          
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
              display_name: `trending_${video.video_id}.mp4`,
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
      const maxAttempts = 60

      while (fileState === 'PROCESSING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        
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

    // Analyze with Gemini - TRENDING VIDEO SPECIFIC PROMPT
    console.log('Analyzing trending video with Gemini 2.0 Flash...')
    
    const analysisPrompt = `Analysiere dieses TRENDING TikTok-Video und erkläre, wie Musiker/Künstler/Bands diese Mechanik für ihre eigene Musik-Promotion adaptieren können.

WICHTIG: Dies ist KEIN Musik-Video. Es ist ein virales TikTok-Video. Deine Aufgabe ist es zu erklären, wie die MECHANIK/das KONZEPT dieses Videos für Musik-Marketing genutzt werden kann.

🚨 KRITISCHE ERSTE PRÜFUNG - BEVOR DU ANALYSIERST:
1. Ist dies ein Sportereignis (NFL, Fußball, Basketball, etc.)? → Score = 1
2. Ist dies eine Award-Show oder Preisverleihung? → Score = 1
3. Ist dies Breaking News oder ein aktuelles Ereignis? → Score = 1
4. Ist dies ein Promi bei einem spezifischen Event? → Score = 1
5. Ist dies ein einmaliger historischer Moment? → Score = 1
6. Zeigt es spezifische Personen in nicht-reproduzierbaren Situationen? → Score = 1-2

Wenn JA zu einer dieser Fragen: Der Score MUSS 1-2 sein, NICHT HÖHER!
Nur wenn NEIN zu allen: Dann bewerte die universelle Mechanik.

Liefere die Analyse im folgenden JSON-Format:

{
  "music_adaptation_score": 1,
  "original_concept": "Kurze Beschreibung des Original-Konzepts/der Mechanik dieses Trending-Videos (2-3 Sätze)",
  "why_it_went_viral": "Warum funktioniert dieses Video so gut? Was macht es viral? (2-3 Sätze)",
  "music_adaptation": {
    "core_mechanic": "Die Kern-Mechanik/das Konzept, das übertragen werden kann",
    "how_to_flip": "Detaillierte Schritt-für-Schritt-Erklärung, wie ein Künstler diese Mechanik für Musik-Content adaptieren kann",
    "example_scenarios": ["3-5 konkrete Beispiele, wie verschiedene Musik-Genres/Künstlertypen dies umsetzen könnten"]
  },
  "best_song_topics": ["Liste von Song-Themen/Genres, für die diese Mechanik besonders gut funktionieren würde"],
  "production_requirements": ["Was braucht ein Künstler, um dies umzusetzen? (Equipment, Skills, etc.)"],
  "engagement_factors": ["Welche Engagement-Faktoren aus dem Original sollten beibehalten werden?"],
  "shotlist_template": ["Szene-für-Szene Template, das ein Künstler für seine eigene Version nutzen kann"]
}

MUSIC ADAPTATION SCORE (0-10):
Bewerte das Potenzial dieses Videos für Musik-Adaptionen auf einer Skala von 0-10.
SEI KRITISCH und REALISTISCH aus Künstler-Perspektive!

SCORING-RICHTLINIEN:
- 0-1: NICHT adaptierbar
  * Einmalige Events (Sportereignisse, Award-Shows, Breaking News)
  * Hochspezifischer Content (nur für bestimmte Personen/Situationen relevant)
  * Nicht reproduzierbar ohne das Original-Event
  * Beispiel: "Giants gewinnen Spiel", "Promi bei Award-Show", "Einmaliges Ereignis"
  
- 2-3: Sehr schwer adaptierbar
  * Sehr spezifische Situationen
  * Benötigt teure Produktion oder spezielle Locations
  * Mechanik funktioniert nur in sehr engen Kontexten
  
- 4-6: Mittleres Potenzial
  * Mit Kreativität umsetzbar, aber nicht offensichtlich
  * Mechanik ist übertragbar, aber erfordert Anpassung
  * Könnte für bestimmte Musik-Genres funktionieren
  
- 7-8: Gutes Potenzial
  * Klar übertragbare Mechanik
  * Gut umsetzbar für verschiedene Künstlertypen
  * Passt natürlich zu Musik-Content
  
- 9-10: Exzellentes Potenzial
  * Universell anwendbare Mechanik
  * Perfekt für Musik-Promotion
  * Einfach umsetzbar, hohes virales Potenzial

KRITISCHE FRAGEN (Sei streng!):
- Ist dies ein einmaliges Event oder eine reproduzierbare Mechanik?
- Kann ein durchschnittlicher Künstler dies realistisch nachstellen?
- Funktioniert die Mechanik OHNE das spezifische Original-Event?
- Ist der Content zu spezifisch (Sport, News, bestimmte Personen)?
- Würde dies für Musik-Fans relevant und interessant sein?

⚠️ WICHTIGE REGEL - STRIKTE BEWERTUNG:
Wenn das Video eines der folgenden zeigt, MUSS der Score 0-2 sein:
- Sportereignisse (Fußball, Basketball, NFL, etc.)
- Award-Shows oder Preisverleihungen
- Breaking News oder aktuelle Ereignisse
- Promi-Momente bei Events
- Einmalige historische Momente
- Spezifische Personen in einmaligen Situationen

Diese Videos sind NICHT adaptierbar, weil:
1. Das Event selbst ist der Content (nicht die Mechanik)
2. Künstler können das Event nicht reproduzieren
3. Der virale Moment ist an das spezifische Ereignis gebunden
4. Ohne das Original-Event funktioniert es nicht

NUR wenn eine KLARE, UNIVERSELLE MECHANIK existiert, die OHNE das Original-Event funktioniert, kann der Score höher sein!

FOKUS:
- Erkläre die ÜBERTRAGBARE MECHANIK, nicht den spezifischen Inhalt
- Sei kreativ: Wie kann ein Künstler dies für Song-Promotion nutzen?
- Denke an verschiedene Musik-Genres und Künstlertypen
- Gib KONKRETE, UMSETZBARE Empfehlungen
- Bewerte realistisch das Adaptions-Potenzial
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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 3072,
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

    // Save analysis to database with upsert
    const updateData: any = {
      gemini_analysis: analysisJson,
      gemini_analyzed_at: new Date().toISOString(),
    }
    
    // Extract and save the music adaptation score if present
    if (analysisJson.music_adaptation_score !== undefined) {
      updateData.music_adaptation_score = analysisJson.music_adaptation_score
      
      // Mark as adaptable if score is 7 or higher
      if (analysisJson.music_adaptation_score >= 7) {
        updateData.is_adaptable = true
      }
    }
    
    // Update the appropriate table
    if (isTrendingVideo) {
      const { error: updateError } = await supabaseClient
        .from('video_library_recommendations')
        .update(updateData)
        .eq('video_id', videoId)

      if (updateError) {
        throw updateError
      }
    } else {
      const { error: updateError } = await supabaseClient
        .from('video_library')
        .update(updateData)
        .eq('id', videoId)

      if (updateError) {
        throw updateError
      }
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

    // Trigger English translation in background (fire and forget)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    fetch(`${supabaseUrl}/functions/v1/translate-gemini-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ 
        videoId, 
        targetLang: 'en',
        isTrending: isTrendingVideo  // Flag to indicate if this is a trending video
      }),
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
