// @ts-nocheck
// Netlify Edge Function - TypeScript errors are expected
import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  
  // Only handle swipe.fm domain
  if (url.hostname !== 'swipe.fm') {
    return; // Pass through to next handler
  }

  // Extract short code from path
  const shortCode = url.pathname.slice(1); // Remove leading /
  
  if (!shortCode) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    // Query Supabase database directly
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL') || 'https://wrlgoxbzlngdtomjhvnz.supabase.co';
    const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/short_urls?short_code=eq.${shortCode}&is_active=eq.true&select=id,destination_url`,
      {
        headers: {
          'apikey': supabaseAnonKey || '',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    const data = await response.json();
    
    if (data && data.length > 0 && data[0].destination_url) {
      const shortUrlId = data[0].id;
      const destinationUrl = data[0].destination_url;
      
      // Track click asynchronously (fire and forget)
      fetch(`${supabaseUrl}/rest/v1/short_url_clicks`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey || '',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          short_url_id: shortUrlId,
          referrer: request.headers.get('referer'),
          user_agent: request.headers.get('user-agent'),
          ip_address: context.ip,
        }),
      }).catch(err => console.error('Click tracking error:', err));

      // Perform redirect
      return new Response(null, {
        status: 301,
        headers: {
          'Location': destinationUrl,
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  } catch (error) {
    console.error('Error in redirect edge function:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const config = {
  path: "/*",
  excludedPath: ["/assets/*", "/*.js", "/*.css", "/*.png", "/*.jpg", "/*.ico"],
};
