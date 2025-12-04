// @ts-nocheck
// This is a Deno edge function - TypeScript errors are expected in Node.js environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader || '' },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const shortUrlId = url.searchParams.get('short_url_id');

    if (!shortUrlId) {
      return new Response(JSON.stringify({ error: 'short_url_id parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user owns this short URL
    const { data: shortUrl, error: ownershipError } = await supabase
      .from('short_urls')
      .select('id, short_code, title, created_by')
      .eq('id', shortUrlId)
      .eq('created_by', user.id)
      .single();

    if (ownershipError || !shortUrl) {
      return new Response(JSON.stringify({ error: 'Short URL not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get click analytics
    const { data: clicks, error: clicksError } = await supabase
      .from('short_url_clicks')
      .select('*')
      .eq('short_url_id', shortUrlId)
      .order('clicked_at', { ascending: false });

    if (clicksError) {
      return new Response(JSON.stringify({ error: clicksError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate analytics
    const totalClicks = clicks.length;
    const uniqueIps = new Set(clicks.map(c => c.ip_address).filter(Boolean)).size;
    
    // Group by date
    const clicksByDate: Record<string, number> = {};
    clicks.forEach(click => {
      const date = new Date(click.clicked_at).toISOString().split('T')[0];
      clicksByDate[date] = (clicksByDate[date] || 0) + 1;
    });

    // Group by referrer
    const clicksByReferrer: Record<string, number> = {};
    clicks.forEach(click => {
      const referrer = click.referrer || 'Direct';
      clicksByReferrer[referrer] = (clicksByReferrer[referrer] || 0) + 1;
    });

    // Recent clicks (last 100)
    const recentClicks = clicks.slice(0, 100).map(click => ({
      clicked_at: click.clicked_at,
      referrer: click.referrer,
      country: click.country,
      city: click.city,
    }));

    return new Response(JSON.stringify({
      short_url: shortUrl,
      analytics: {
        total_clicks: totalClicks,
        unique_ips: uniqueIps,
        clicks_by_date: clicksByDate,
        clicks_by_referrer: clicksByReferrer,
        recent_clicks: recentClicks,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in short-url-analytics function:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
