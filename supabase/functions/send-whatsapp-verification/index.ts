// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { phone, code, name } = await req.json()

    // Validate required fields
    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone, code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean and validate the phone number for WhatsApp
    const cleanPhone = phone.replace(/\D/g, '').trim();
    console.log('🔔 WhatsApp Verification: Phone number:', phone, 'Cleaned:', cleanPhone);
    
    if (!cleanPhone || cleanPhone.length < 10) {
      console.error('❌ WhatsApp Verification: Invalid phone number');
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const displayName = name || 'Kunde';
    
    const message = `🔐 *SwipeUp Marketing - Verifizierung*\n\n` +
      `Hallo ${displayName},\n\n` +
      `Dein Bestätigungscode lautet:\n\n` +
      `*${code}*\n\n` +
      `Bitte gib diesen Code ein, um fortzufahren.\n\n` +
      `Der Code ist 10 Minuten gültig.`;

    console.log('🔔 WhatsApp Verification: Sending code to phone:', cleanPhone);
    
    // Get WhatsApp API configuration
    const WHAPI_TOKEN = Deno.env.get('VITE_WHAPI_TOKEN');
    const API_URL = 'https://gate.whapi.cloud/messages/text';
    
    if (!WHAPI_TOKEN) {
      console.error('❌ WhatsApp Verification: No API token available');
      return new Response(
        JSON.stringify({ error: 'WhatsApp API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Send to individual phone number
    const whatsappResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: `${cleanPhone}@c.us`, // Individual contact format
        body: message,
        preview_url: false
      })
    });
    
    if (whatsappResponse.ok) {
      const responseData = await whatsappResponse.json();
      console.log('✅ WhatsApp Verification: Code sent successfully');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verification code sent successfully',
          messageId: responseData.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const errorText = await whatsappResponse.text();
      console.log('❌ WhatsApp Verification: Send failed:', whatsappResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
