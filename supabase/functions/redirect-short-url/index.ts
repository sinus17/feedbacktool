// @ts-nocheck
// This is a Deno edge function - TypeScript errors are expected in Node.js environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShortUrl {
  id: string;
  destination_url: string;
  is_active: boolean;
  expires_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Extract short code from path like /redirect-short-url/campaign -> campaign
    const pathParts = url.pathname.split('/').filter(Boolean);
    const shortCode = pathParts[pathParts.length - 1]; // Get last part

    console.log('Request URL:', req.url);
    console.log('Pathname:', url.pathname);
    console.log('Extracted short code:', shortCode);

    // If no short code, return 404
    if (!shortCode || shortCode === 'redirect-short-url') {
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Initialize Supabase client with anon key (RLS allows public read for active URLs)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Look up the short URL
    const { data: shortUrl, error: lookupError } = await supabase
      .from('short_urls')
      .select('id, destination_url, is_active, expires_at')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .maybeSingle<ShortUrl>();

    console.log('Lookup result:', { shortCode, shortUrl, lookupError });

    if (lookupError) {
      console.error('Database error:', lookupError);
      return new Response('Database Error', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    if (!shortUrl) {
      console.log('Short URL not found for code:', shortCode);
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Check if URL is active
    if (!shortUrl.is_active) {
      return new Response('This link has been deactivated', { 
        status: 410,
        headers: corsHeaders 
      });
    }

    // Check if URL has expired
    if (shortUrl.expires_at && new Date(shortUrl.expires_at) < new Date()) {
      return new Response('This link has expired', { 
        status: 410,
        headers: corsHeaders 
      });
    }

    // Track the click (fire and forget - don't wait for it)
    const clickData = {
      short_url_id: shortUrl.id,
      referrer: req.headers.get('referer') || null,
      user_agent: req.headers.get('user-agent') || null,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || 
                  req.headers.get('x-real-ip') || null,
      metadata: {
        accept_language: req.headers.get('accept-language'),
        host: req.headers.get('host'),
      }
    };

    // Track click asynchronously
    supabase
      .from('short_url_clicks')
      .insert(clickData)
      .then(({ error }) => {
        if (error) console.error('Error tracking click:', error);
      });

    // Perform the redirect
    return new Response(null, {
      status: 301,
      headers: {
        ...corsHeaders,
        'Location': shortUrl.destination_url,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error in redirect function:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
