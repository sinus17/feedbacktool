// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-timezone',
};

serve(async (req) => {
  console.log('📥 Request received:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📦 Request body:', body);
    const { url } = body;

    if (!url) {
      console.log('❌ No URL provided');
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('🔍 Fetching preview for:', url);
    
    let thumbnailUrl: string | null = null;

    // Try TikTok oEmbed API first (fast and reliable)
    if (url.includes('tiktok.com')) {
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        console.log('📡 Trying TikTok oEmbed API...');
        
        const oembedResponse = await fetch(oembedUrl);
        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();
          thumbnailUrl = oembedData.thumbnail_url;
          console.log('✅ Got thumbnail from TikTok oEmbed:', thumbnailUrl);
        }
      } catch (e) {
        console.log('⚠️ TikTok oEmbed failed, trying HTML scraping...', e);
      }
    }
    
    // Try Instagram - extract shortcode and use RapidAPI
    if (!thumbnailUrl && url.includes('instagram.com')) {
      try {
        const shortcodeMatch = url.match(/instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
        if (shortcodeMatch) {
          const shortcode = shortcodeMatch[2];
          console.log('📡 Trying Instagram API for shortcode:', shortcode);
          
          const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
          if (rapidApiKey) {
            const instagramResponse = await fetch('https://instagram-media-api.p.rapidapi.com/media/shortcode', {
              method: 'POST',
              headers: {
                'x-rapidapi-key': rapidApiKey,
                'x-rapidapi-host': 'instagram-media-api.p.rapidapi.com',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ shortcode, proxy: '' })
            });
            
            if (instagramResponse.ok) {
              const instagramData = await instagramResponse.json();
              thumbnailUrl = instagramData.data?.xdt_shortcode_media?.thumbnail_src || 
                           instagramData.data?.xdt_shortcode_media?.display_url;
              console.log('✅ Got thumbnail from Instagram API:', thumbnailUrl);
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Instagram API failed:', e);
      }
    }

    // Fallback: scrape HTML if no thumbnail found yet
    if (!thumbnailUrl) {
      try {
        console.log('📄 Fetching HTML as fallback...');
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (response.ok) {
          const html = await response.text();
          console.log('📄 HTML length:', html.length);

          // Try multiple patterns
          let match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (match) thumbnailUrl = match[1];
          
          if (!thumbnailUrl) {
            match = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
            if (match) thumbnailUrl = match[1];
          }
        }
      } catch (e) {
        console.log('⚠️ HTML scraping failed:', e);
      }
    }

    console.log('🖼️ Final thumbnail URL:', thumbnailUrl);

    return new Response(
      JSON.stringify({ thumbnailUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
