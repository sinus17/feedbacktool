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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const campaignData = await req.json()
    console.log('📝 Received campaign submission:', campaignData)

    // Create or update artist
    let artistId = campaignData.selected_artist_id

    if (!artistId) {
      // Create new artist
      const { data: newArtist, error: artistError } = await supabase
        .from('artists')
        .insert({
          name: campaignData.kuenstlername,
          instagram_url: campaignData.instagram_url,
          tiktok_url: campaignData.tiktok_url,
          facebook_page_url: campaignData.facebook_page_url,
          spotify_url: campaignData.spotify_track_url || null,
        })
        .select()
        .single()

      if (artistError) {
        console.error('Error creating artist:', artistError)
        throw new Error('Failed to create artist')
      }

      artistId = newArtist.id
      console.log('✅ Created new artist:', artistId)
    } else {
      // Update existing artist with social URLs
      const { error: updateError } = await supabase
        .from('artists')
        .update({
          instagram_url: campaignData.instagram_url,
          tiktok_url: campaignData.tiktok_url,
          facebook_page_url: campaignData.facebook_page_url,
        })
        .eq('id', artistId)

      if (updateError) {
        console.error('Error updating artist:', updateError)
      }
    }

    // Create or get customer first
    // Use firma if provided, otherwise use kuenstlername
    const customerName = campaignData.firma || campaignData.kuenstlername
    const customerType = campaignData.firma ? 'company' : 'individual'
    
    const { data: existingCustomer, error: customerCheckError } = await supabase
      .from('customers')
      .select('id')
      .eq('name', customerName)
      .single()

    let customerId = existingCustomer?.id

    if (!customerId) {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: customerName,
          type: customerType,
        })
        .select()
        .single()

      if (customerError) {
        console.error('Error creating customer:', customerError)
        throw new Error('Failed to create customer')
      }

      customerId = newCustomer.id
      console.log('✅ Created new customer:', customerId, 'Type:', customerType)
    }

    // Create or get contact
    const { data: existingContact, error: contactCheckError } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', campaignData.email)
      .single()

    let contactId = existingContact?.id

    if (!contactId) {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          customer_id: customerId,
          first_name: campaignData.vorname,
          last_name: campaignData.nachname,
          email: campaignData.email,
          phone: campaignData.telefon,
          street: campaignData.strasse,
          zip: campaignData.plz,
          city: campaignData.ort,
          country: campaignData.land,
        })
        .select()
        .single()

      if (contactError) {
        console.error('Error creating contact:', contactError)
        throw new Error('Failed to create contact')
      }

      contactId = newContact.id
      console.log('✅ Created new contact:', contactId)

      // Link artist to contact
      await supabase
        .from('artist_contacts')
        .insert({
          artist_id: artistId,
          contact_id: contactId,
        })
    }

    // Create release record
    const { data: release, error: releaseError } = await supabase
      .from('releases')
      .insert({
        artist_id: artistId,
        name: campaignData.release_name,
        release_date: campaignData.release_date,
        spotify_url: campaignData.spotify_track_url || null,
        spotify_uri: campaignData.spotify_uri || null,
        cover_url: campaignData.cover_link || null,
        master_file_url: campaignData.master_datei_link || null,
        ad_budget: campaignData.werbebudget_netto,
        service_package: campaignData.content_strategy_upsell ? 'full' : 'basic',
        total_budget: 400 + (campaignData.content_strategy_upsell ? 400 : 0) + campaignData.werbebudget_netto,
        status: 'submitted',
        user_type: campaignData.user_type,
        voucher_code: campaignData.voucher_promocode || null,
        is_published: campaignData.release_published === 'yes',
      })
      .select()
      .single()

    if (releaseError) {
      console.error('Error creating release:', releaseError)
      throw new Error('Failed to create release')
    }

    console.log('✅ Release created successfully:', release.id)

    return new Response(
      JSON.stringify({
        success: true,
        release_id: release.id,
        artist_id: artistId,
        message: 'Campaign submitted successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
