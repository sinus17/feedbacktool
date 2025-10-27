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

// Extract artist ID from Spotify URL
function extractArtistId(spotifyUrl: string): string | null {
  // Supports formats:
  // https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb
  // spotify:artist:4Z8W4fKeB5YxbusRsdQVPb
  const match = spotifyUrl.match(/artist[\/:]([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { spotify_url } = await req.json();

    if (!spotify_url) {
      return new Response(
        JSON.stringify({ error: 'Missing spotify_url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract artist ID from URL
    const artistId = extractArtistId(spotify_url);
    if (!artistId) {
      return new Response(
        JSON.stringify({ error: 'Invalid Spotify URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎵 Fetching Spotify data for artist ID: ${artistId}`);

    // Get access token
    const accessToken = await getSpotifyAccessToken();

    // Fetch artist data
    const artistResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!artistResponse.ok) {
      const errorText = await artistResponse.text();
      console.error('Spotify API error:', artistResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch artist data from Spotify' }),
        { status: artistResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const artistData = await artistResponse.json();

    // Fetch related artists
    let relatedArtists = [];
    try {
      const relatedResponse = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/related-artists`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (relatedResponse.ok) {
        const relatedData = await relatedResponse.json();
        relatedArtists = relatedData.artists.slice(0, 10).map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          spotify_url: artist.external_urls.spotify,
          image: artist.images[0]?.url || null,
          popularity: artist.popularity
        }));
      }
    } catch (err) {
      console.log('Could not fetch related artists:', err);
    }

    // Extract relevant data
    const result = {
      id: artistData.id,
      name: artistData.name,
      image: artistData.images[0]?.url || null,
      genres: artistData.genres || [],
      popularity: artistData.popularity,
      followers: artistData.followers?.total || 0,
      spotify_url: artistData.external_urls?.spotify,
      related_artists: relatedArtists
    };

    console.log(`✅ Successfully fetched Spotify data for ${artistData.name}`);

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
