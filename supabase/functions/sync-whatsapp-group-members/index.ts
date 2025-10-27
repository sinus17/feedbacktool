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
    // Parse the request body (optional artist_id to sync specific artist)
    const body = await req.json().catch(() => ({}));
    const { artist_id } = body;

    // Get WhatsApp API configuration
    const WHAPI_TOKEN = Deno.env.get('VITE_WHAPI_TOKEN');
    
    if (!WHAPI_TOKEN) {
      console.error('❌ WhatsApp Sync: No API token available');
      return new Response(
        JSON.stringify({ error: 'WhatsApp API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get artists to sync
    let query = supabase
      .from('artists')
      .select('id, name, whatsapp_group_id')
      .not('whatsapp_group_id', 'is', null);

    if (artist_id) {
      query = query.eq('id', artist_id);
    }

    const { data: artists, error: artistsError } = await query;

    if (artistsError) {
      console.error('❌ Error fetching artists:', artistsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch artists', details: artistsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Syncing ${artists?.length || 0} artist groups`);

    let successCount = 0;
    let failCount = 0;
    const syncResults = [];

    for (const artist of artists || []) {
      try {
        // Ensure group ID has @g.us suffix
        let groupId = artist.whatsapp_group_id;
        if (!groupId.includes('@')) {
          groupId = `${groupId}@g.us`;
        }

        // Get group info from WHAPI
        const groupResponse = await fetch(
          `https://gate.whapi.cloud/groups/${groupId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${WHAPI_TOKEN}`,
              'Accept': 'application/json'
            }
          }
        );

        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          const participants = groupData.participants || [];

          console.log(`✅ Syncing ${participants.length} members for artist ${artist.name}`);

          // Delete old cache entries for this artist
          await supabase
            .from('artist_whatsapp_group_members')
            .delete()
            .eq('artist_id', artist.id);

          // Insert new cache entries
          const membersToInsert = participants.map((participant: any) => {
            // Clean phone number (remove @c.us, @s.whatsapp.net)
            const cleanPhone = participant.id?.replace('@c.us', '').replace('@s.whatsapp.net', '');
            
            return {
              artist_id: artist.id,
              whatsapp_group_id: artist.whatsapp_group_id,
              whatsapp_group_name: groupData.name,
              member_phone: cleanPhone,
              member_rank: participant.rank || 'member',
              last_synced_at: new Date().toISOString(),
              sync_status: 'success'
            };
          });

          if (membersToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('artist_whatsapp_group_members')
              .insert(membersToInsert);

            if (insertError) {
              console.error(`❌ Error inserting members for ${artist.name}:`, insertError);
              failCount++;
              syncResults.push({
                artist_id: artist.id,
                artist_name: artist.name,
                status: 'failed',
                error: insertError.message
              });
            } else {
              successCount++;
              syncResults.push({
                artist_id: artist.id,
                artist_name: artist.name,
                status: 'success',
                members_synced: membersToInsert.length
              });
            }
          }
        } else {
          const errorText = await groupResponse.text();
          console.log(`⚠️ Could not fetch group ${groupId} for artist ${artist.name}: ${groupResponse.status}`);
          
          // Log failed sync
          failCount++;
          syncResults.push({
            artist_id: artist.id,
            artist_name: artist.name,
            status: 'failed',
            error: `HTTP ${groupResponse.status}: ${errorText}`
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error syncing group for artist ${artist.name}:`, errorMessage);
        failCount++;
        syncResults.push({
          artist_id: artist.id,
          artist_name: artist.name,
          status: 'failed',
          error: errorMessage
        });
      }
    }

    console.log(`✅ Sync complete: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Synced ${successCount} artist groups successfully`,
        total_artists: artists?.length || 0,
        success_count: successCount,
        fail_count: failCount,
        results: syncResults
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
