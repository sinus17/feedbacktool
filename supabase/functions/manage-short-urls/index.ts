// @ts-nocheck
// This is a Deno edge function - TypeScript errors are expected in Node.js environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
    const method = req.method;

    // GET - List all short URLs (all users can see all links for management)
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('short_urls')
        .select(`
          *,
          click_count
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create a new short URL
    if (method === 'POST') {
      const body = await req.json();
      const { short_code, destination_url, title, description, expires_at, metadata } = body;

      // Validate required fields
      if (!short_code || !destination_url) {
        return new Response(JSON.stringify({ error: 'short_code and destination_url are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate short_code format (alphanumeric, hyphens, underscores only)
      if (!/^[a-zA-Z0-9_-]+$/.test(short_code)) {
        return new Response(JSON.stringify({ error: 'short_code can only contain letters, numbers, hyphens, and underscores' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate URL format
      try {
        new URL(destination_url);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid destination URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('short_urls')
        .insert({
          short_code,
          destination_url,
          title: title || null,
          description: description || null,
          expires_at: expires_at || null,
          metadata: metadata || {},
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        // Check for duplicate short_code
        if (error.code === '23505') {
          return new Response(JSON.stringify({ error: 'This short code is already in use' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH - Update a short URL
    if (method === 'PATCH') {
      const body = await req.json();
      const { id, destination_url, title, description, is_active, expires_at, metadata } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: 'id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updateData: any = {};
      if (destination_url !== undefined) updateData.destination_url = destination_url;
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (expires_at !== undefined) updateData.expires_at = expires_at;
      if (metadata !== undefined) updateData.metadata = metadata;

      const { data, error } = await supabase
        .from('short_urls')
        .update(updateData)
        .eq('id', id)
        .eq('created_by', user.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete a short URL
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');

      if (!id) {
        return new Response(JSON.stringify({ error: 'id parameter is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('short_urls')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in manage-short-urls function:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
