// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the request body
    const { name, email, phone, password, isPasswordReset } = await req.json()

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, email, phone, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean and validate the phone number for WhatsApp
    const cleanPhone = phone.replace(/\D/g, '').trim();
    console.log('🔔 WhatsApp: Phone number:', phone, 'Cleaned:', cleanPhone);
    
    if (!cleanPhone || cleanPhone.length < 10) {
      console.error('❌ WhatsApp: Invalid phone number for login credentials');
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actionType = isPasswordReset ? 'Password Reset' : 'Account Created';
    const welcomeText = isPasswordReset 
      ? 'Your password has been reset.'
      : 'Welcome to the Feedback Tool!';

    const message = `🔐 *${actionType}*\n\n` +
      `Hello ${name},\n\n` +
      `${welcomeText}\n\n` +
      `**Login Credentials:**\n` +
      `Email: ${email}\n` +
      `Password: ${password}\n\n` +
      `🔗 Login at: http://localhost:3000/login\n\n` +
      `Please change your password after your first login for security.`;

    console.log('🔔 WhatsApp: Sending login credentials to phone (fire and forget):', cleanPhone);
    
    // Get WhatsApp API configuration
    const WHAPI_TOKEN = Deno.env.get('VITE_WHAPI_TOKEN');
    const API_URL = 'https://gate.whapi.cloud/messages/text';
    
    if (!WHAPI_TOKEN) {
      console.error('❌ WhatsApp: No API token available');
      return new Response(
        JSON.stringify({ error: 'WhatsApp API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Send to individual phone number (not group)
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
        preview_url: true
      })
    });
    
    if (whatsappResponse.ok) {
      console.log('✅ WhatsApp: Login credentials sent successfully');
      return new Response(
        JSON.stringify({ success: true, message: 'WhatsApp credentials sent successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      const errorText = await whatsappResponse.text();
      console.log('❌ WhatsApp: Login credentials send failed:', whatsappResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
