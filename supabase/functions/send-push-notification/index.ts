import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const VAPID_PUBLIC_KEY = 'BLeXYHMpjqspKNY_pxGtuCHgDbH6IxE6Ksk0vAtZPySciN9JvgrDX20TtAbjLWapDQU_BYO3Qbc4IQr10MWZTDk';
const VAPID_PRIVATE_KEY = 'rLySOBREIcQ9kr26LOAmBwsjI65IxyLxQ0Sg08KVJj4';

// Import web-push library
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body, icon, badge, url } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) {
      throw error;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    // Configure web-push
    webpush.setVapidDetails(
      'mailto:support@swipeup.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      title: title || 'SwipeUp',
      body: body || 'New trend available!',
      icon: icon || '/plane_new.png',
      badge: badge || '/plane_new.png',
      url: url || '/library?tab=feed&public=true'
    });

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      (subscriptions || []).map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          console.log(`✅ Sent to ${sub.endpoint}`);
          return { success: true, endpoint: sub.endpoint };
        } catch (err) {
          console.error(`❌ Failed to send to ${sub.endpoint}:`, err);
          
          // If subscription is invalid, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
            console.log(`🗑️ Removed invalid subscription: ${sub.endpoint}`);
          }
          
          return { success: false, endpoint: sub.endpoint, error: err.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successful} notifications, ${failed} failed`,
        total: subscriptions?.length || 0,
        successful,
        failed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
