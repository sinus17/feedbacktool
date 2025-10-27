// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the request body
    const { phone } = await req.json()

    // Validate required fields
    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: phone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean and validate the phone number for WhatsApp
    const cleanPhone = phone.replace(/\D/g, '').trim();
    console.log('🔍 WhatsApp Group Lookup: Phone number:', phone, 'Cleaned:', cleanPhone);
    
    if (!cleanPhone || cleanPhone.length < 10) {
      console.error('❌ WhatsApp Group Lookup: Invalid phone number');
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get WhatsApp API configuration
    const WHAPI_TOKEN = Deno.env.get('VITE_WHAPI_TOKEN');
    
    if (!WHAPI_TOKEN) {
      console.error('❌ WhatsApp Group Lookup: No API token available');
      return new Response(
        JSON.stringify({ error: 'WhatsApp API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all artists with their WhatsApp group IDs
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name, whatsapp_group_id')
      .not('whatsapp_group_id', 'is', null);

    if (artistsError) {
      console.error('❌ Error fetching artists:', artistsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch artists', details: artistsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Looking up phone ${cleanPhone} in cached members table`);

    // Create phone number variations for matching
    let searchPhones = [cleanPhone];
    
    // Add variations for German numbers
    if (cleanPhone.startsWith('+49')) {
      searchPhones.push(cleanPhone.substring(3)); // Remove +49
      searchPhones.push('0' + cleanPhone.substring(3)); // Add 0 prefix
      searchPhones.push(cleanPhone.substring(1)); // Remove +
    } else if (cleanPhone.startsWith('49')) {
      searchPhones.push('+' + cleanPhone); // Add + prefix
      searchPhones.push('0' + cleanPhone.substring(2)); // Replace 49 with 0
      searchPhones.push(cleanPhone.substring(2)); // Remove 49
    } else if (cleanPhone.startsWith('0')) {
      searchPhones.push('49' + cleanPhone.substring(1)); // Replace 0 with 49
      searchPhones.push('+49' + cleanPhone.substring(1)); // Replace 0 with +49
    } else if (cleanPhone.startsWith('+')) {
      searchPhones.push(cleanPhone.substring(1)); // Remove +
    }

    console.log(`🔍 Searching for phone variations:`, searchPhones);

    // Fast lookup from cached members table
    const { data: memberMatches, error: memberError } = await supabase
      .from('artist_whatsapp_group_members')
      .select(`
        artist_id,
        whatsapp_group_name,
        member_phone,
        member_rank,
        artists!inner(id, name, whatsapp_group_id)
      `)
      .in('member_phone', searchPhones);

    if (memberError) {
      console.error('❌ Error looking up cached members:', memberError);
      return new Response(
        JSON.stringify({ error: 'Failed to lookup members', details: memberError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Found ${memberMatches?.length || 0} member matches`);

    // Transform results to unique artists
    const matchingArtists = [];
    const seenArtistIds = new Set();

    for (const match of memberMatches || []) {
      if (!seenArtistIds.has(match.artist_id)) {
        seenArtistIds.add(match.artist_id);
        matchingArtists.push({
          id: match.artists.id,
          name: match.artists.name,
          whatsapp_group_id: match.artists.whatsapp_group_id,
          whatsapp_group_name: match.whatsapp_group_name,
          member_rank: match.member_rank
        });
      }
    }

    console.log(`✅ Found ${matchingArtists.length} matching artists for phone ${cleanPhone}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        artists: matchingArtists,
        count: matchingArtists.length,
        cached: true
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
