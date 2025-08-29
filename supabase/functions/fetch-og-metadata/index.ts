import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
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
      new URL(targetUrl);
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
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch URL: ${response.status} ${response.statusText}` 
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
    const metadata = {
      title: extractMetaTag(html, 'og:title'),
      description: extractMetaTag(html, 'og:description'),
      image: extractMetaTag(html, 'og:image'),
      url: extractMetaTag(html, 'og:url'),
      type: extractMetaTag(html, 'og:type'),
      siteName: extractMetaTag(html, 'og:site_name'),
    };

    return new Response(
      JSON.stringify({ metadata }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching metadata:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch metadata" }),
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