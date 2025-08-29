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
    const fileUrl = url.searchParams.get("url");
    const filename = url.searchParams.get("filename") || "video.mp4";

    if (!fileUrl) {
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
      new URL(fileUrl);
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

    // Process Dropbox URLs to add dl=1 parameter
    let processedUrl = fileUrl;
    if (fileUrl.includes('dropbox.com')) {
      const urlObj = new URL(fileUrl);
      urlObj.searchParams.set('dl', '1');
      processedUrl = urlObj.toString();
    }

    // Fetch the file
    const response = await fetch(processedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch file: ${response.status} ${response.statusText}` 
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

    // Get the file content
    const fileContent = await response.arrayBuffer();

    // Determine file extension and content type
    let contentType = "application/octet-stream";
    let fileExtension = "mp4";
    
    if (filename.toLowerCase().endsWith('.mov')) {
      contentType = "video/quicktime";
      fileExtension = "mov";
    } else if (filename.toLowerCase().endsWith('.webm')) {
      contentType = "video/webm";
      fileExtension = "webm";
    } else if (filename.toLowerCase().endsWith('.mp4')) {
      contentType = "video/mp4";
      fileExtension = "mp4";
    }

    // Generate a safe filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_') || `video.${fileExtension}`;

    // Return the file with forced download headers
    return new Response(fileContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/octet-stream", // Force download
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error in force-download function:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Failed to download file" }),
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