// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const GOOGLE_TRANSLATE_API_KEY = 'AIzaSyDSSNnnzvp8B__633-XmXjJOnJ9G7xj5Ms';
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

async function translateText(text: any, targetLang: string = 'de'): Promise<string> {
  // Convert to string if it's not already
  const textToTranslate = typeof text === 'string' ? text : String(text);
  
  // Skip translation for empty strings or very short strings
  if (!textToTranslate || textToTranslate.trim().length === 0) {
    return textToTranslate;
  }
  
  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: textToTranslate,
      target: targetLang,
      format: 'text'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}

async function translateGeminiAnalysis(analysis: any, targetLang: string = 'en', isTrending: boolean = false): Promise<any> {
  const translated: any = {};

  if (isTrending) {
    // Translate trending video analysis fields
    if (analysis.original_concept) {
      translated.original_concept = await translateText(analysis.original_concept, targetLang);
    }

    if (analysis.why_it_went_viral) {
      translated.why_it_went_viral = await translateText(analysis.why_it_went_viral, targetLang);
    }

    if (analysis.music_adaptation) {
      translated.music_adaptation = {
        core_mechanic: analysis.music_adaptation.core_mechanic ? await translateText(analysis.music_adaptation.core_mechanic, targetLang) : '',
        how_to_flip: analysis.music_adaptation.how_to_flip ? await translateText(analysis.music_adaptation.how_to_flip, targetLang) : '',
        example_scenarios: analysis.music_adaptation.example_scenarios && Array.isArray(analysis.music_adaptation.example_scenarios)
          ? await Promise.all(analysis.music_adaptation.example_scenarios.map((s: string) => translateText(s, targetLang)))
          : []
      };
    }

    if (analysis.best_song_topics && Array.isArray(analysis.best_song_topics)) {
      translated.best_song_topics = await Promise.all(
        analysis.best_song_topics.map((topic: string) => translateText(topic, targetLang))
      );
    }

    if (analysis.production_requirements && Array.isArray(analysis.production_requirements)) {
      translated.production_requirements = await Promise.all(
        analysis.production_requirements.map((req: string) => translateText(req, targetLang))
      );
    }

    if (analysis.shotlist_template && Array.isArray(analysis.shotlist_template)) {
      translated.shotlist_template = await Promise.all(
        analysis.shotlist_template.map((shot: string) => translateText(shot, targetLang))
      );
    }

    if (analysis.engagement_factors && Array.isArray(analysis.engagement_factors)) {
      translated.engagement_factors = await Promise.all(
        analysis.engagement_factors.map((factor: string) => translateText(factor, targetLang))
      );
    }
  } else {
    // Translate regular video analysis fields
    if (analysis.hook) {
      translated.hook = await translateText(analysis.hook, targetLang);
    }

    if (analysis.content_type) {
      translated.content_type = await translateText(analysis.content_type, targetLang);
    }

    if (analysis.visual_style) {
      translated.visual_style = await translateText(analysis.visual_style, targetLang);
    }

    // Translate shotlist array (handle both strings and objects)
    if (analysis.shotlist && Array.isArray(analysis.shotlist)) {
      translated.shotlist = await Promise.all(
        analysis.shotlist.map(async (shot: any) => {
          if (typeof shot === 'string') {
            return await translateText(shot, targetLang);
          } else if (typeof shot === 'object') {
            // If it's an object, translate the description field
            const translatedShot: any = {};
            if (shot.scene) translatedShot.scene = await translateText(shot.scene, targetLang);
            if (shot.action) translatedShot.action = await translateText(shot.action, targetLang);
            if (shot.description) translatedShot.description = await translateText(shot.description, targetLang);
            return translatedShot;
          }
          return shot;
        })
      );
    }

    // Translate engagement_factors array
    if (analysis.engagement_factors && Array.isArray(analysis.engagement_factors)) {
      translated.engagement_factors = await Promise.all(
        analysis.engagement_factors.map((factor: string) => translateText(factor, targetLang))
      );
    }
  }

  return translated;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-timezone',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Translation request received');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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

    const { videoId, targetLang = 'en', isTrending = false } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing videoId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tableName = isTrending ? 'video_library_recommendations' : 'video_library';
    const idField = isTrending ? 'video_id' : 'id';
    console.log('Fetching video:', videoId, 'Target language:', targetLang, 'Is trending:', isTrending);

    // Get the video with analysis
    const { data: video, error: fetchError } = await supabaseClient
      .from(tableName)
      .select('gemini_analysis')
      .eq(idField, videoId)
      .single();

    if (fetchError || !video) {
      throw new Error(`Failed to fetch video: ${fetchError?.message}`);
    }

    if (!video.gemini_analysis) {
      return new Response(
        JSON.stringify({ error: 'No Gemini analysis found for this video' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const langName = targetLang === 'en' ? 'English' : 'German';
    console.log(`Translating analysis to ${langName}...`);

    // Translate the analysis
    const translatedAnalysis = await translateGeminiAnalysis(video.gemini_analysis, targetLang, isTrending);

    console.log(`Saving ${langName} translation...`);

    // Save the translation to the appropriate column
    const updateColumn = targetLang === 'en' ? 'gemini_analysis_en' : 'gemini_analysis_de';
    const { error: updateError } = await supabaseClient
      .from(tableName)
      .update({ [updateColumn]: translatedAnalysis })
      .eq(idField, videoId);

    if (updateError) {
      throw new Error(`Failed to save translation: ${updateError.message}`);
    }

    console.log('Translation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Analysis translated to ${langName}`,
        translation: translatedAnalysis
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
