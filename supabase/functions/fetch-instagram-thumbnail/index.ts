import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

// CORS headers to allow requests from any origin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const instagramUrl = url.searchParams.get("url");
    const creativeId = url.searchParams.get("creativeId");

    if (!instagramUrl) {
      return new Response(
        JSON.stringify({ error: "Instagram URL parameter is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate URL format
    try {
      new URL(instagramUrl);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch the HTML content
    const response = await fetch(instagramUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch Instagram URL: ${response.status} ${response.statusText}` 
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const html = await response.text();

    // Extract Open Graph metadata
    const ogImage = extractMetaTag(html, 'og:image');
    
    // If we have a creative ID and a thumbnail URL, update the database
    if (creativeId) {
      try {
        // Create a Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        
        if (!supabaseUrl || !supabaseKey) {
          console.error("Error: Missing Supabase environment variables");
        } else {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          if (ogImage) {
            // Update the ad creative with the thumbnail URL
            const { error: updateError } = await supabase
              .from('ad_creatives')
              .update({ 
                instagram_thumbnail_url: ogImage,
                updated_at: new Date().toISOString()
              })
              .eq('id', creativeId);
              
            if (updateError) {
              console.error("Error updating ad creative:", updateError);
            } else {
              console.log("Updated thumbnail for creative ID:", creativeId);
            }
          }
        }
      } catch (dbError) {
        console.error("Database update error:", dbError);
      }
    }

    return new Response(
      JSON.stringify({ 
        thumbnailUrl: ogImage || null,
        metadata: {
          title: extractMetaTag(html, 'og:title'),
          description: extractMetaTag(html, 'og:description'),
          url: extractMetaTag(html, 'og:url'),
          type: extractMetaTag(html, 'og:type'),
          siteName: extractMetaTag(html, 'og:site_name'),
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching Instagram thumbnail:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch Instagram thumbnail" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function extractMetaTag(html: string, property: string): string | null {
  // Try with property attribute (Open Graph standard)
  const propertyRegex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  let match = html.match(propertyRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Try with name attribute (some sites use this instead)
  const nameRegex = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  match = html.match(nameRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Try with content first, then property (order reversed)
  const reverseRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["'][^>]*>`, 'i');
  match = html.match(reverseRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}