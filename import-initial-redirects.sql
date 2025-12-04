-- Import initial swipe.fm redirects
-- Run this before switching Cloudflare DNS to Netlify

-- First, get the admin user ID (you'll need to replace this with your actual user ID)
-- You can find your user ID by running: SELECT id, email FROM auth.users;

-- For now, we'll insert with a placeholder and you can update it
-- Or we can use the first admin user

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the first user (you can modify this to get a specific user by email)
    SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
    
    -- Insert all the redirects
    INSERT INTO public.short_urls (short_code, destination_url, title, created_by, is_active) VALUES
    ('campaign', 'https://wkf.ms/3QH2ORQ', 'Campaign Link', admin_user_id, true),
    ('access', 'https://swipeup-marketing.notion.site/Account-Freigaben-5663e8da87f34a39ab2b5957d61b301c?source=copy_link', 'Account Access (DE)', admin_user_id, true),
    ('zoom', 'https://us06web.zoom.us/j/3203597972', 'Zoom Meeting', admin_user_id, true),
    ('stats', 'https://www.notion.so/swipeup-marketing/Instagram-TikTok-Account-Stats-1b55bcd5930f8076bcfce4a80d364ab5?source=copy_link', 'Account Stats (DE)', admin_user_id, true),
    ('stats-en', 'https://www.notion.so/swipeup-marketing/Instagram-TikTok-Account-Stats-1d75bcd5930f805a94d4db3ee348fdc6?source=copy_link', 'Account Stats (EN)', admin_user_id, true),
    ('access-en', 'https://www.notion.so/swipeup-marketing/Account-Freigaben-984f4004329e45b2bceeee841c0ab6c0?source=copy_link', 'Account Access (EN)', admin_user_id, true),
    ('benchmarks', 'https://swipeup-marketing.notion.site/KPIs-Benchmarks-0bfbe49b0995411daf87daa63c47e099?source=copy_link', 'KPIs & Benchmarks (DE)', admin_user_id, true),
    ('benchmarks-en', 'https://swipeup-marketing.notion.site/KPIs-Benchmarks-19f5bcd5930f808e986dc3fddbc91e67?source=copy_link', 'KPIs & Benchmarks (EN)', admin_user_id, true),
    ('spotify-uri', 'https://swipeup-marketing.notion.site/Album-URI-vor-Release-auf-Spotify-finden-0e8d259b89bd4230810f9b09d557a554?source=copy_link', 'Spotify URI Guide', admin_user_id, true),
    ('auth', 'https://www.notion.so/swipeup-marketing/TikTok-AUTH-Code-generieren-1625bcd5930f8044b326dfd63be695fd?source=copy_link', 'TikTok AUTH Code', admin_user_id, true)
    ON CONFLICT (short_code) DO UPDATE SET
        destination_url = EXCLUDED.destination_url,
        title = EXCLUDED.title,
        updated_at = NOW();
    
    RAISE NOTICE 'Successfully imported % redirects', 10;
END $$;

-- Verify the imports
SELECT short_code, destination_url, title, is_active 
FROM public.short_urls 
WHERE short_code IN ('campaign', 'access', 'zoom', 'stats', 'stats-en', 'access-en', 'benchmarks', 'benchmarks-en', 'spotify-uri', 'auth')
ORDER BY short_code;
