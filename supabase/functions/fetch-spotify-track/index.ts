// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get Spotify access token using Client Credentials flow
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Extract track ID from Spotify URL
function extractTrackId(spotifyUrl: string): string | null {
  // Supports formats:
  // https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
  // spotify:track:4iV5W9uYEdYUVa79Axb7Rh
  const match = spotifyUrl.match(/track[\/:]([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { spotify_track_url } = await req.json();

    if (!spotify_track_url) {
      return new Response(
        JSON.stringify({ error: 'Missing spotify_track_url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract track ID from URL
    const trackId = extractTrackId(spotify_track_url);
    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'Invalid Spotify URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎵 Fetching Spotify track data for ID: ${trackId}`);

    // Get access token
    const accessToken = await getSpotifyAccessToken();

    // Fetch track data
    const trackResponse = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!trackResponse.ok) {
      const errorText = await trackResponse.text();
      console.error('Spotify API error:', trackResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch track data from Spotify' }),
        { status: trackResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const trackData = await trackResponse.json();

    // Extract relevant data
    const result = {
      id: trackData.id,
      name: trackData.name,
      artist: trackData.artists[0]?.name || '',
      artists: trackData.artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        spotify_url: a.external_urls?.spotify
      })),
      album: trackData.album?.name || '',
      release_date: trackData.album?.release_date || '',
      cover_image: trackData.album?.images[0]?.url || null,
      cover_images: trackData.album?.images || [],
      duration_ms: trackData.duration_ms,
      preview_url: trackData.preview_url,
      spotify_url: trackData.external_urls?.spotify,
      spotify_uri: trackData.uri,
      isrc: trackData.external_ids?.isrc,
      explicit: trackData.explicit,
      popularity: trackData.popularity
    };

    console.log(`✅ Successfully fetched Spotify track: ${trackData.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
