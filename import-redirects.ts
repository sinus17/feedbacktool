import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrlgoxbzlngdtomjhvnz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ5MDc3NywiZXhwIjoyMDQ4MDY2Nzc3fQ.YOUR_SERVICE_ROLE_KEY'; // You'll need to add your service role key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const redirects = [
  {
    short_code: 'campaign',
    destination_url: 'https://wkf.ms/3QH2ORQ',
    title: 'Campaign Link',
  },
  {
    short_code: 'access',
    destination_url: 'https://swipeup-marketing.notion.site/Account-Freigaben-5663e8da87f34a39ab2b5957d61b301c?source=copy_link',
    title: 'Account Access (DE)',
  },
  {
    short_code: 'zoom',
    destination_url: 'https://us06web.zoom.us/j/3203597972',
    title: 'Zoom Meeting',
  },
  {
    short_code: 'stats',
    destination_url: 'https://www.notion.so/swipeup-marketing/Instagram-TikTok-Account-Stats-1b55bcd5930f8076bcfce4a80d364ab5?source=copy_link',
    title: 'Account Stats (DE)',
  },
  {
    short_code: 'stats-en',
    destination_url: 'https://www.notion.so/swipeup-marketing/Instagram-TikTok-Account-Stats-1d75bcd5930f805a94d4db3ee348fdc6?source=copy_link',
    title: 'Account Stats (EN)',
  },
  {
    short_code: 'access-en',
    destination_url: 'https://www.notion.so/swipeup-marketing/Account-Freigaben-984f4004329e45b2bceeee841c0ab6c0?source=copy_link',
    title: 'Account Access (EN)',
  },
  {
    short_code: 'benchmarks',
    destination_url: 'https://swipeup-marketing.notion.site/KPIs-Benchmarks-0bfbe49b0995411daf87daa63c47e099?source=copy_link',
    title: 'KPIs & Benchmarks (DE)',
  },
  {
    short_code: 'benchmarks-en',
    destination_url: 'https://swipeup-marketing.notion.site/KPIs-Benchmarks-19f5bcd5930f808e986dc3fddbc91e67?source=copy_link',
    title: 'KPIs & Benchmarks (EN)',
  },
  {
    short_code: 'spotify-uri',
    destination_url: 'https://swipeup-marketing.notion.site/Album-URI-vor-Release-auf-Spotify-finden-0e8d259b89bd4230810f9b09d557a554?source=copy_link',
    title: 'Spotify URI Guide',
  },
  {
    short_code: 'auth',
    destination_url: 'https://www.notion.so/swipeup-marketing/TikTok-AUTH-Code-generieren-1625bcd5930f8044b326dfd63be695fd?source=copy_link',
    title: 'TikTok AUTH Code',
  },
];

async function importRedirects() {
  console.log('🚀 Starting redirect import...\n');

  // Get the first admin user
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError || !users || users.users.length === 0) {
    console.error('❌ Error getting users:', userError);
    return;
  }

  const adminUserId = users.users[0].id;
  console.log(`✓ Using admin user: ${users.users[0].email} (${adminUserId})\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const redirect of redirects) {
    try {
      const { data, error } = await supabase
        .from('short_urls')
        .upsert({
          short_code: redirect.short_code,
          destination_url: redirect.destination_url,
          title: redirect.title,
          created_by: adminUserId,
          is_active: true,
        }, {
          onConflict: 'short_code',
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error importing ${redirect.short_code}:`, error.message);
        errorCount++;
      } else {
        console.log(`✓ Imported: swipe.fm/${redirect.short_code} → ${redirect.destination_url}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception importing ${redirect.short_code}:`, err);
      errorCount++;
    }
  }

  console.log(`\n📊 Import complete:`);
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total: ${redirects.length}`);
}

importRedirects().catch(console.error);
