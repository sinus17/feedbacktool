// @ts-nocheck
// Netlify Edge Function - TypeScript errors are expected
import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  
  console.log('Edge function called:', url.hostname, url.pathname);
  
  // Only handle swipe.fm domain
  if (url.hostname !== 'swipe.fm') {
    console.log('Not swipe.fm, passing through');
    return; // Pass through to next handler
  }

  // Extract short code from path
  const shortCode = url.pathname.slice(1); // Remove leading /
  
  console.log('Short code:', shortCode);
  
  if (!shortCode) {
    return new Response('Not Found - No short code', { status: 404 });
  }

  try {
    // Query Supabase database directly
    const supabaseUrl = 'https://wrlgoxbzlngdtomjhvnz.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0OTA3NzcsImV4cCI6MjA0ODA2Njc3N30.ZCAreV5YsR26maw8QrulmTq7GSXvfpYuKXP-ocTfhtk';
    
    console.log('Querying database for:', shortCode);
    
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
    
    console.log('Database response:', data);
    
    if (data && data.length > 0 && data[0].destination_url) {
      const shortUrlId = data[0].id;
      const destinationUrl = data[0].destination_url;
      
      console.log('Redirecting to:', destinationUrl);
      
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
    
    console.log('No matching short URL found');
    return new Response('Not Found - No match in database', { status: 404 });
  } catch (error) {
    console.error('Error in redirect edge function:', error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
};

export const config = {
  path: "/*",
  excludedPath: ["/assets/*", "/*.js", "/*.css", "/*.png", "/*.jpg", "/*.ico"],
};
